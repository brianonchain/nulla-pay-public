"use client";
// next
import { useState } from "react";
import Image from "next/image";
// custom hooks
import { useFlashBalanceQuery, useCexBalanceQuery, useCexTxnsQuery } from "../../../hooks";
// wagmi & viem
import { useConfig, useAccount } from "wagmi";
import { readContract, signTypedData } from "@wagmi/core";
import { parseUnits, formatUnits, encodeFunctionData, hexToSignature, isAddress, Abi, Address, TypedData } from "viem";
// gelato relay
import { GelatoRelay, CallWithSyncFeeRequest } from "@gelatonetwork/relay-sdk";
// i18n
import { useTranslations } from "next-intl";
// images
import { CiBank } from "react-icons/ci";
import { FaArrowDown, FaCircleCheck, FaAngleLeft, FaCircleArrowDown } from "react-icons/fa6";
import { FaLongArrowAltDown } from "react-icons/fa";
// utils
import SpinningCircleWhite from "@/utils/components/SpinningCircleWhite";
import { CashoutSettings, PaymentSettings } from "@/db/UserModel";
import { currency2decimal, currency2symbol } from "@/utils/constants";
import { networkToInfo } from "@/utils/web3Constants";
import erc20Abi from "@/utils/abis/erc20Abi";
import flashAbi from "@/utils/abis/flashAbi";
import { FlashInfo } from "@/utils/types";

export default function TransferModal({
  transferModal,
  setTransferModal,
  paymentSettings,
  cashoutSettings,
  rates,
  setErrorModal,
  flashInfo,
  cbEvmAddress,
  cbBankAccountName,
}: {
  transferModal: "toCex" | "toAny" | "toBank" | null;
  setTransferModal: any;
  paymentSettings: PaymentSettings;
  cashoutSettings: CashoutSettings;
  rates: any;
  setErrorModal: any;
  flashInfo: FlashInfo;
  cbEvmAddress: string;
  cbBankAccountName: string;
}) {
  // hooks
  const t = useTranslations("App.CashOut");
  const tcommon = useTranslations("Common");
  const account = useAccount();
  const config = useConfig();
  const { data: flashBalance, refetch: refetchFlashBalance } = useFlashBalanceQuery();
  const { data: cexBalance } = useCexBalanceQuery();
  const { refetch: refetchCexTxns } = useCexTxnsQuery();

  // states
  const [blockchainFee, setBlockchainFee] = useState(0.01); // in USDC
  const [usdcTransferAmount, setUsdcTransferAmount] = useState<string | null>(null);
  const [anyAddress, setAnyAddress] = useState<string>("");
  const [transferState, setTransferState] = useState("initial"); // "initial" | "sending" | "sent"
  const [txHash, setTxHash] = useState<string | undefined>(); // withdrawal tx hash
  const [usdcTransferToBankActual, setUsdcTransferToBankActual] = useState<string | null>(null);
  const [fiatDeposited, setFiatDeposited] = useState<string | null>(null);

  const onClickTransferToCexSubmit = async () => {
    // check if amount exists
    if (!usdcTransferAmount) {
      setErrorModal(t("errors.enterAmount"));
      return;
    }
    // check if amount >= 1
    if (Number(usdcTransferAmount) < 1) {
      setErrorModal(t("errors.minUSDC"));
      return;
    }

    // determine toAddress
    let toAddress = "";
    if (transferModal === "toAny") {
      if (anyAddress) {
        toAddress = anyAddress;
      } else {
        setErrorModal(t("errors.toEvmAddress"));
      }
    } else {
      if (cashoutSettings.cex === "Coinbase" && paymentSettings.merchantCountry != "Other") {
        if (cbEvmAddress) {
          toAddress = cbEvmAddress;
        } else {
          setErrorModal("Error: Did not detect a deposit address");
          return;
        }
      } else {
        if (cashoutSettings?.cexEvmAddress) {
          toAddress = cashoutSettings?.cexEvmAddress;
        } else {
          // this condition should not be possible but will add anyway
          setErrorModal(
            <div className="">
              Please first enter your <span className="font-semibold">Cash Out Platform's Address</span> under <span className="font-semibold">Settings</span>
            </div>
          );
          return;
        }
      }
    }

    // check if toAddress if valid
    if (!isAddress(toAddress)) {
      setErrorModal(t("errors.validEvmAddress"));
      return;
    }

    const makeGaslessTransfer = async () => {
      const chainId = account.chainId;
      if (!chainId) return;
      setTransferState("sending");

      // 1. define variables
      const usdcAddress = networkToInfo[String(chainId)].usdcAddress;
      const flashAddress = networkToInfo[String(chainId)].flashAddress;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 3; // 3 minute deadline
      const nonce = (await readContract(config, {
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "nonces",
        args: [account.address ?? "0x0"],
      })) as bigint;

      // 2. sign two EIP712 messages
      const permitSignatureHex = await signTypedData(config, {
        types: {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        } as const satisfies TypedData, // must const-assert
        primaryType: "Permit",
        domain: { name: "USD Coin", version: "2", chainId: chainId, verifyingContract: usdcAddress },
        message: {
          owner: paymentSettings?.merchantEvmAddress as Address,
          spender: flashAddress,
          value: parseUnits(usdcTransferAmount, 6),
          nonce: nonce,
          deadline: BigInt(deadline),
        },
      });
      const paySignatureHex = await signTypedData(config, {
        types: {
          Pay: [
            { name: "toAddress", type: "address" },
            { name: "nonce", type: "uint256" },
          ],
        } as const satisfies TypedData, // must const-assert
        primaryType: "Pay",
        domain: { name: "FlashPayments", version: "1", chainId: chainId, verifyingContract: flashAddress },
        message: { toAddress: toAddress as Address, nonce: nonce },
      });

      // 3. get v, r, s, from permitSignature and paySignature
      const permitSignature = hexToSignature(permitSignatureHex);
      const paySignature = hexToSignature(paySignatureHex);

      // 4. construct payCalldata & encode the function arguments
      const paymentData = {
        from: paymentSettings?.merchantEvmAddress,
        to: toAddress,
        amount: parseUnits(usdcTransferAmount, 6),
        permitData: { deadline: deadline, signature: { v: permitSignature.v, r: permitSignature.r, s: permitSignature.s } },
      };
      const payCalldata = encodeFunctionData({ abi: flashAbi, functionName: "pay", args: [paymentData, paySignature] }); // GelatoRelay request.data only takes encoded calldata

      // 5. make Gelato Relay API call
      const relay = new GelatoRelay();
      const request: CallWithSyncFeeRequest = {
        chainId: BigInt(chainId),
        target: flashAddress,
        data: payCalldata,
        feeToken: usdcAddress,
        isRelayContext: true,
      };
      try {
        var { taskId } = await relay.callWithSyncFee(request);
      } catch (e) {
        setErrorModal("Withdrawal failed. Please try again or contact us.");
        setTransferState("initial");
        return;
      }

      // 6. poll for completion
      for (let i = 1; i < 50; i++) {
        try {
          var taskStatus = await relay.getTaskStatus(taskId);
        } catch {} // try needed so one failed request won't exit function
        if (taskStatus && taskStatus.taskState == "ExecSuccess") {
          setTxHash(taskStatus.transactionHash);
          setTransferState("sent");
          refetchFlashBalance();
          setTimeout(() => refetchCexTxns(), 10000);
          return;
        }
        if (taskStatus?.taskState == "ExecReverted" || taskStatus?.taskState == "Cancelled") {
          setErrorModal("Your withdrawal failed. Please try again.");
          setTransferState("initial");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // if polling time out
      setErrorModal("We were unable to confirm if the withdrawal was successful. Please check your wallet balance to confirm. We apologize for the inconvenience.");
      setTransferState("initial");
    };
    await makeGaslessTransfer();
  };

  const onClickTransferToBankSubmit = async () => {
    // check if amount exists
    if (!usdcTransferAmount) {
      setErrorModal(t("errors.enterAmount"));
      return;
    }
    // if amount exceeds Coinbase balance
    if (Number(usdcTransferAmount) > Number(cexBalance)) {
      setErrorModal(t("errors.lowBalance"));
      return;
    }
    // check if amount >= 1
    if (Number(usdcTransferAmount) < 11) {
      setErrorModal(t("errors.minUSDC11"));
      return;
    }
    if (Number(usdcTransferAmount) > 10000.1) {
      setErrorModal("errors.maxUSDC");
      return;
    }

    setTransferState("sending");
    try {
      const res = await fetch("/api/cbWithdraw", {
        method: "POST",
        body: JSON.stringify({
          amount: usdcTransferAmount,
          merchantCurrency: paymentSettings?.merchantCurrency,
          cbAccessToken: window.sessionStorage.getItem("cbAccessToken"),
        }),
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) throw new Error("error");
      const resJson = await res.json();
      if (resJson.status === "success") {
        setFiatDeposited(resJson.fiatAmountBought);
        setUsdcTransferToBankActual(resJson.usdcAmountSold);
        setTransferState("sent");
        return;
      } else if (resJson.status === "error") {
        setErrorModal(resJson.message);
      } else {
        setErrorModal(t("errors.unknownTransferError"));
      }
    } catch (e) {
      setErrorModal(t("errors.unknownTransferError"));
    }
    setTransferState("initial");
  };

  return (
    <div>
      <div className="transferModal">
        {/*--- CLOSE/BACK BUTTON ---*/}
        {transferState === "initial" && (
          <>
            {/*--- close (tablet/desktop) ---*/}
            <div
              className="xButtonContainer"
              onClick={() => {
                setTransferModal(null);
                setUsdcTransferAmount(null);
              }}
            >
              <div className="xButton">&#10005;</div>
            </div>
            {/*--- back (mobile) ---*/}
            <FaAngleLeft
              className="mobileBack"
              onClick={() => {
                setTransferModal(null);
                setUsdcTransferAmount(null);
              }}
            />
          </>
        )}

        {/*--- title ---*/}
        <div className={`${transferState === "sent" ? "invisible" : ""} fullModalHeader whitespace-nowrap`}>
          {transferModal === "toCex" && tcommon("transferToCEX", { cex: cashoutSettings.cex ? cashoutSettings.cex : tcommon("CEX") })}
          {transferModal === "toAny" && tcommon("transfer")}
          {transferModal === "toBank" && tcommon("transferToBank")}
        </div>

        {/*--- CONTENT ---*/}
        <div className="transferModalContentContainer">
          {transferState != "sent" && (
            <>
              {/*--- FROM CARD ---*/}
              <div className="p-[16px] bg-dark3 rounded-[12px] flex flex-col z-[2]">
                {/*--- from info ---*/}
                <div className="flex items-center gap-x-[12px]">
                  <div className="transferIcon">
                    {(transferModal === "toCex" || transferModal === "toAny") && <Image src="/logoIcon.svg" alt="logo" fill />}
                    {transferModal === "toBank" && <Image src="/coinbase.svg" alt="logo" fill />}
                  </div>
                  {(transferModal === "toCex" || transferModal === "toAny") && (
                    <div>
                      <p className="transferText">{tcommon("from")}: Nulla</p>
                      <p className="transferSubtext">
                        {tcommon("address")}: {paymentSettings?.merchantEvmAddress.slice(0, 7)}...
                        {paymentSettings?.merchantEvmAddress.slice(-5)}
                      </p>
                      <p className="transferSubtext">
                        {tcommon("balance")}: {flashBalance} USDC
                      </p>
                    </div>
                  )}
                  {transferModal === "toBank" && (
                    <div className="">
                      <div className="transferText">{tcommon("fromCoinbase")}</div>
                      <div className="transferSubtext">
                        {cbEvmAddress.slice(0, 7)}...
                        {cbEvmAddress.slice(-5)}
                      </div>
                      <div className="transferSubtext">
                        {tcommon("balance")}: {cexBalance} USDC
                      </div>
                    </div>
                  )}
                </div>

                {/*--- from amount ---*/}
                <div className="mt-[11px] w-full flex items-center relative">
                  <input
                    className="transferAmountFromBox inputColor placeholder:not-italic"
                    type="number"
                    inputMode="decimal"
                    onChange={(e) => setUsdcTransferAmount(e.currentTarget.value)}
                    value={usdcTransferAmount || ""}
                    placeholder="0"
                    disabled={transferState === "sending" ? true : false}
                  />
                  {/*--- max + USDC ---*/}
                  <div className="h-full right-0 absolute flex space-x-[12px] items-center">
                    <div
                      className="text-base landscape:xl:desktop:text-sm font-bold text-blue-500 cursor-pointer"
                      onClick={() => setUsdcTransferAmount(transferModal === "toBank" ? cexBalance ?? "0" : flashBalance ?? "0")}
                    >
                      {tcommon("max")}
                    </div>
                    <div className="transferUsdc">USDC</div>
                  </div>
                </div>
              </div>

              {/*--- FUNNEL ---*/}
              {/* <div className="flex h-[40px] relative">
                <div className="absolute right-[calc(100%-14px)] w-[20px] h-full bg-dark2 rounded-r-[18px] z-[2]"></div>
                <div className="w-[52px] h-full bg-dark3"></div>
                <div className="absolute left-[calc(100%-14px)] w-[20px] bg-dark2 h-full bg-none rounded-l-[18px] z-[2]"></div>
              </div> */}

              {/*--- ARROW ---*/}
              <div className="flex h-[40px] relative">
                <div className="absolute translate-y-[-50px] translate-x-[-50%] w-[70px] h-[70px] rotate-45 bg-dark3"></div>
              </div>

              {/*--- TO CARD ---*/}
              <div className="w-full px-[16px] py-[16px] bg-dark3 rounded-[12px] flex flex-col">
                {/*--- to info ---*/}
                {(transferModal === "toCex" || transferModal === "toBank") && (
                  <div className="flex items-center gap-x-[12px]">
                    {/*--- icon ---*/}
                    <div className="transferIcon">
                      {transferModal === "toCex" && (
                        <>
                          {cashoutSettings?.cex == "Coinbase" && <Image src="/coinbase.svg" alt="Coinbase icon" fill />}
                          {cashoutSettings?.cex == "MAX" && <Image src="/max.svg" alt="MAX icon" fill />}
                          {cashoutSettings?.cex == "BitoPro" && <Image src="/coinbase.svg" alt="BitoPro icon" fill />}
                          {cashoutSettings?.cex == "Other" && <Image src="/coinbase.svg" alt="other" fill />}{" "}
                        </>
                      )}
                      {transferModal === "toBank" && (
                        <div className="w-full h-full border border-dark6 rounded-[8px] flex justify-center items-center">
                          <CiBank className="text-[40px] text-slate-600 dark:text-white" />
                        </div>
                      )}
                    </div>
                    {/*--- text ---*/}
                    <div>
                      {transferModal === "toCex" && (
                        <>
                          <div className="font-medium !leading-[1.15]">
                            {tcommon("toCEX", {
                              cex: cashoutSettings.cex ? tcommon(cashoutSettings.cex) : tcommon("CEX"),
                            })}
                          </div>
                          <div className="transferSubtext">
                            {cashoutSettings.cex === "Coinbase" && paymentSettings.merchantCountry != "Other" ? (
                              cbEvmAddress ? (
                                `${tcommon("address")}: ${cbEvmAddress.slice(0, 7)}...${cbEvmAddress.slice(-5)}`
                              ) : (
                                <div className="w-[160px] skeleton">0000</div>
                              )
                            ) : (
                              `${cashoutSettings?.cexEvmAddress.slice(0, 10)}...${cashoutSettings?.cexEvmAddress.slice(-8)}`
                            )}
                          </div>
                        </>
                      )}
                      {transferModal === "toBank" && (
                        <>
                          <div className="font-medium !leading-[1.1]">{tcommon("toBank")}</div>
                          {cbBankAccountName ? <div className="transferSubtext">{cbBankAccountName}</div> : <div className="w-[160px] textSmApp py-[4px] skeleton">0000</div>}
                        </>
                      )}
                    </div>
                  </div>
                )}
                {transferModal === "toAny" && (
                  <>
                    <div className="font-medium">
                      {tcommon("to")}: {t("toAddress")} <Image src="./polygon.svg" alt="polygon" width={20} height={18} className="inline-block pb-[4px] mx-[2px]" /> Polygon
                    </div>
                    <textarea
                      id="settingsCexDepositAddress"
                      rows={2}
                      className="mt-[2px] w-full py-[6px] px-[8px] textSmAppPx !leading-tight inputColor rounded-[8px] resize-none"
                      placeholder={t("enterAnEvmAddress")}
                      onChange={(e) => setAnyAddress(e.target.value)}
                      value={anyAddress}
                    />
                  </>
                )}
                {/*--- to amount ---*/}
                <div className="transferAmountToBox">
                  {transferModal != "toBank" && (
                    <>
                      <div className="">{Number(usdcTransferAmount) >= 1 ? (Number(usdcTransferAmount) - blockchainFee).toFixed(2) : "0"}</div>
                      <div className="transferUsdc">USDC</div>
                    </>
                  )}
                  {transferModal === "toBank" && (
                    <>
                      <div className="">
                        {currency2symbol[paymentSettings?.merchantCurrency!]}{" "}
                        {usdcTransferAmount
                          ? paymentSettings?.merchantCurrency == "USD"
                            ? ((Number(usdcTransferAmount) - 0.01) * 0.99987).toFixed(2)
                            : (Number(usdcTransferAmount) * rates.usdcToLocal * 0.99988).toFixed(currency2decimal[paymentSettings?.merchantCurrency!])
                          : (0).toFixed(currency2decimal[paymentSettings?.merchantCurrency!])}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/*--- TRANSFER FEE ---*/}
              <div className="flex-1 flex items-center textSmApp textGray">
                {transferModal === "toCex" || transferModal === "toAny" ? (
                  <>
                    {tcommon("transferCost")} ~{blockchainFee} USDC
                  </>
                ) : (
                  <>
                    <div className="">
                      1 USDC <span>={paymentSettings?.merchantCurrency != "USD"}</span> {currency2symbol[paymentSettings?.merchantCurrency!]}
                      {rates.usdcToLocal}
                    </div>
                    {paymentSettings?.merchantCurrency == "USD" && <div>~0.001% fee</div>}
                  </>
                )}
              </div>
            </>
          )}

          {transferState === "sent" && (
            <div className="h-[460px] desktop:h-[400px] flex flex-col justify-center gap-[60px]">
              <div className="w-full flex flex-col items-center gap-[16px]">
                <FaCircleCheck className="text-[100px] text-green-500" />
                <div className="text2XlApp font-medium">{tcommon("transferSuccessful")}!</div>
              </div>
              <div className="text-center">
                {(transferModal === "toCex" || transferModal === "toAny") &&
                  t.rich("transferToCexSuccessModal", {
                    span1: (chunks) => <span className="font-bold">{chunks}</span>,
                    amount: usdcTransferAmount,
                    cex: cashoutSettings.cex ? tcommon(cashoutSettings.cex) : tcommon("CEX"),
                  })}
                {transferModal === "toBank" && (
                  <div className="space-y-[16px]">
                    <div>
                      <span className="font-bold">{Number(usdcTransferAmount).toFixed(2)} USDC</span> {t("transferToBankSuccessModal.text-1")}
                    </div>
                    <div>
                      <span className="font-bold">
                        {currency2symbol[paymentSettings?.merchantCurrency!]}
                        {fiatDeposited}
                      </span>{" "}
                      {t("transferToBankSuccessModal.text-2")}
                    </div>
                    <div>{t("transferToBankSuccessModal.text-3")}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/*--- BUTTON ---*/}
          <div className="flex-1 min-h-[120px] desktop:min-h-[90px] w-full flex flex-col items-center justify-center">
            {transferState == "initial" && (
              <button
                onClick={transferModal === "toCex" || transferModal === "toAny" ? onClickTransferToCexSubmit : onClickTransferToBankSubmit}
                className="appButton1 w-full"
                disabled={transferModal === "toCex" && !cbEvmAddress ? true : false}
              >
                {transferModal === "toCex" &&
                  tcommon("transferToCEX", {
                    cex: cashoutSettings.cex ? tcommon(cashoutSettings.cex).replace(" Exchange", "") : tcommon("CEX"),
                  })}
                {transferModal === "toAny" && tcommon("transfer")}
                {transferModal === "toBank" && tcommon("transferToBank")}
              </button>
            )}
            {transferState === "sending" && (
              <button className="flex items-center justify-center w-full appButtonPending">
                <SpinningCircleWhite />
                &nbsp; {tcommon("transferring")}...
              </button>
            )}
            {transferState === "sent" && (
              <button
                className="appButton1 w-full"
                onClick={() => {
                  setTransferState("initial");
                  setTransferModal(null);
                  setUsdcTransferAmount(null);
                  if (transferModal === "toBank") {
                    setUsdcTransferToBankActual(null);
                    setFiatDeposited(null);
                  }
                }}
              >
                {tcommon("close")}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="modalBlackout"></div>
    </div>
  );
}
