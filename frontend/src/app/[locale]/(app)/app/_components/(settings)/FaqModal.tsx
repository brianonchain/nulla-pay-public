// next
import { useState } from "react";
import Image from "next/image";
// other
import { useTranslations, useLocale } from "next-intl";
// constants
import { currencyToExample } from "@/utils/constants";
// components
import TradeMAXModal from "../modals/exchanges/TradeMAXModal";
// images
import { FaAngleLeft } from "react-icons/fa6";
import { CashoutSettings, PaymentSettings } from "@/db/UserModel";

const Instructions = ({ paymentSettings, cashoutSettings, setFaqModal }: { paymentSettings: PaymentSettings; cashoutSettings: CashoutSettings; setFaqModal: any }) => {
  const [expand, setExpand] = useState("");
  const [tradeMAXModal, setTradeMAXModal] = useState(false);

  const t = useTranslations("App.InstructionsModal");
  const tcommon = useTranslations("Common");
  const locale = useLocale();

  const titles =
    paymentSettings.merchantCurrency == "USD"
      ? [
          { title: t("title.setup"), id: "setup" },
          { title: t("title.pay"), id: "pay" },
          { title: t("title.confirm"), id: "confirm" },
          { title: t("title.log"), id: "log" },
          { title: t("title.refund"), id: "refund" },
          { title: t("title.cashout"), id: "cashout" },
          { title: t("title.cashback"), id: "cashback" },
          { title: t("title.fees"), id: "fees" },
          { title: t("title.rate"), id: "rate" },
        ]
      : [
          { title: t("title.setup"), id: "setup" },
          { title: t("title.pay"), id: "pay" },
          { title: t("title.confirm"), id: "confirm" },
          { title: t("title.log"), id: "log" },
          { title: t("title.refund"), id: "refund" },
          { title: t("title.cashout"), id: "cashout" },
          { title: t("title.cashback"), id: "cashback" },
          { title: t("title.fees"), id: "fees" },
          { title: t("title.lose"), id: "lose" },
          { title: t("title.rate"), id: "rate" },
        ];

  return (
    <div>
      {/*--- QUESITONS MODAL ---*/}
      <div className="fullModal">
        {/*--- header ---*/}
        <div className="fullModalHeader">{t("instructions")}</div>
        {/*--- mobile back ---*/}
        <FaAngleLeft className="mobileBack" onClick={() => setFaqModal(false)} />
        {/*--- tablet/desktop close ---*/}
        <div className="xButtonContainer" onClick={() => setFaqModal(false)}>
          <div className="xButton">&#10005;</div>
        </div>
        {/*--- content ---*/}
        <div className="fullModalContentContainer scrollbar font-medium">
          <div className="fullModalContentContainer2 max-w-[600px]">
            {/*--- questions ---*/}
            {titles.map((i, index) => (
              <div
                className={`${
                  titles.length == index + 1 ? "border-b" : ""
                } desktop:px-[12px] py-[16px] desktop:py-[10px] flex items-center justify-between cursor-pointer desktop:hover:bg-light3 dark:desktop:hover:bg-dark5 border-t border-slate-300 dark:border-dark6 transition-all ease-in duration-[100ms] desktop:hover:!duration-[300ms]`}
                onClick={() => setExpand(i.id)}
              >
                <div className="">{i.title}</div>
                <div className="">&#10095;</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/*--- ANSWER MODAL ---*/}
      {expand && (
        <div className="fullModal z-91">
          {/*--- header ---*/}
          <div className="fullModalHeader">
            {expand == "setup" && <div>{t("title.setup")}</div>}
            {expand == "pay" && <div>{t("title.pay")}</div>}
            {expand == "confirm" && <div>{t("title.confirm")}</div>}
            {expand == "log" && <div>{t("title.log")}</div>}
            {expand == "refund" && <div>{t("title.refund")}</div>}
            {expand == "cashout" && <div>{t("title.cashout")}</div>}
            {expand == "cashback" && <div>{t("title.cashback")}</div>}
            {expand == "fees" && <div>{t("title.fees")}</div>}
            {expand == "lose" && <div>{t("title.lose")}</div>}
            {expand == "rate" && <div>{t("title.rate")}</div>}
          </div>
          {/*--- mobile back ---*/}
          <FaAngleLeft className="mobileBack" onClick={() => setExpand("")} />
          {/*--- tablet/desktop close ---*/}
          <div className="xButtonContainer" onClick={() => setExpand("")}>
            <div className="xButton">&#10005;</div>
          </div>
          {/*--- content ---*/}
          <div className="fullModalContentContainer scrollbar">
            <div className="fullModalContentContainer2 max-w-[600px]">
              {expand == "setup" && paymentSettings.merchantPaymentType == "inperson" && (
                <div className="space-y-3">
                  <p>{t("setup-1")}</p>
                  <p>{t.rich("setup-2", { span: (chunks) => <span className="font-bold">{chunks}</span> })}</p>
                  <p>{t("setup-3")}</p>
                </div>
              )}
              {expand == "pay" && (
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative w-full max-w-[320px] sm:max-w-[300px] h-[calc(100vw*(3/4*0.85))] max-h-[calc(320px*(3/4))] sm:max-h-[calc(300px*(3/4))] flex-none">
                    <Image
                      src="/intro-scan.png"
                      alt="customer scanning qr code"
                      fill
                      style={{
                        objectFit: "cover",
                      }}
                    />
                  </div>
                  <p className="pt-[8px] relative">
                    {t.rich("pay-1", {
                      span1: (chunks) => <span className="group">{chunks}</span>,
                      span2: (chunks) => <span className="link">{chunks}</span>,
                      span3: (chunks) => <span className="group">{chunks}</span>,
                      span4: (chunks) => <span className="link">{chunks}</span>,
                      span5: (chunks) => <span className="group">{chunks}</span>,
                      span6: (chunks) => <span className="link">{chunks}</span>,
                      div1: (chunks) => <div className="w-full top-[calc(100%+4px)] tooltip">{chunks}</div>,
                      div2: (chunks) => <div className="w-full top-[calc(100%+4px)] tooltip">{chunks}</div>,
                      div3: (chunks) => <div className="w-full top-[calc(100%+4px)] tooltip">{chunks}</div>,
                      sup1: (chunks) => <sup>{chunks}</sup>,
                      sup2: (chunks) => <sup>{chunks}</sup>,
                      sup3: (chunks) => <sup>{chunks}</sup>,
                      tooltip1: tcommon("mmTooltip"),
                      tooltip2: tcommon("usdcTooltip"),
                      tooltip3: tcommon("polygonTooltip"),
                    })}
                  </p>
                  <p>
                    {t.rich("pay-2", {
                      span: (chunks) => <span className="font-bold">{chunks}</span>,
                      merchantCurrency: paymentSettings.merchantCurrency,
                    })}
                  </p>
                  <p>
                    {t.rich("pay-3", {
                      span: (chunks) => <span className={`${paymentSettings.merchantCurrency == "USD" ? "hidden" : ""}`}>{chunks}</span>,
                      merchantCurrency: paymentSettings.merchantCurrency,
                    })}
                  </p>
                </div>
              )}
              {expand == "confirm" && (
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative w-[200px] h-[330px]">
                    <Image src={"/phoneConfirmPayment.png"} alt="confirming payment" fill style={{ objectFit: "contain" }} />
                  </div>
                  <p>{t.rich("confirm-1", { span: (chunks) => <span className="font-bold">{chunks}</span> })}</p>
                </div>
              )}
              {expand == "log" && (
                <div className="space-y-3">
                  <p>{t.rich("log-1", { span: (chunks) => <span className="font-bold">{chunks}</span> })}</p>
                  <p>{t("log-2")}</p>
                </div>
              )}
              {expand == "refund" && (
                <div className="space-y-3">
                  <p>{t.rich("refund-1", { span: (chunks) => <span className="font-bold">{chunks}</span> })}</p>
                  <p>{t("refund-2")}</p>
                  <p>{t.rich("refund-3", { span1: (chunks) => <span className="font-bold">{chunks}</span>, span2: (chunks) => <span className="font-bold">{chunks}</span> })}</p>
                  <p>{t("refund-4")}</p>
                </div>
              )}
              {expand == "cashout" && (
                <div>
                  {paymentSettings.merchantCountry != "Other" && cashoutSettings.cex == "Coinbase" ? (
                    <div className="space-y-3">
                      <div className="font-bold">{t("cashout-settingUp")}</div>
                      <div className="flex">
                        <div className="mr-2">1.</div>
                        <div>{t("cashout-1cb")}</div>
                      </div>
                      <div className="flex">
                        <div className="mr-1.5">2.</div>
                        <div>{t.rich("cashout-2cb", { span: (chunks) => <span className="font-bold">{chunks}</span> })} </div>
                      </div>
                      <div className="font-bold">{t("cashout-cashingOut")}</div>
                      <div className="flex">
                        <div className="mr-1.5">1.</div>
                        <div>{t.rich("cashout-3cb", { span: (chunks) => <span className="font-bold">{chunks}</span> })} </div>
                      </div>
                      <div className="flex">
                        <div className="mr-1.5">2.</div>
                        <div>
                          <div>{t.rich("cashout-4cb", { span: (chunks) => <span className="font-bold">{chunks}</span>, merchantCurrency: paymentSettings.merchantCurrency })}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="space-y-2">
                        <div className="font-bold">{t("cashout-settingUp")}</div>
                        <div className="flex">
                          <div className="modalNumber">1.</div>
                          <div>
                            {t.rich("cashout-1", {
                              span1: (chunks) => <span className={`${cashoutSettings.cex ? "" : "hidden"}`}>{chunks}</span>,
                              span2: (chunks) => <span className={`${cashoutSettings.cex ? "hidden" : ""}`}>{chunks}</span>,
                              cex: cashoutSettings.cex ? tcommon(cashoutSettings.cex) : tcommon("CEX"),
                            })}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="modalNumber">2.</div>
                          <div>
                            {t.rich("cashout-2", {
                              span: (chunks) => <span className="font-bold">{chunks}</span>,
                              cex: cashoutSettings.cex ? tcommon(cashoutSettings.cex) : tcommon("CEX"),
                            })}
                          </div>
                        </div>
                        <div className="pt-3 font-bold">{t("cashout-cashingOut")}</div>
                        <div className="flex">
                          <div className="modalNumber">3.</div>
                          <div>
                            {t.rich("cashout-3", {
                              span: (chunks) => <span className="font-bold">{chunks}</span>,
                              cex: cashoutSettings.cex ? tcommon(cashoutSettings.cex) : tcommon("CEX"),
                            })}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="modalNumber">4.</div>
                          <div>
                            <div>
                              {t("cashout-4", {
                                cex: cashoutSettings.cex ? tcommon(cashoutSettings.cex) : tcommon("CEX"),
                                merchantCurrency: cashoutSettings.cex ? paymentSettings.merchantCurrency : "your local currency",
                              })}
                            </div>
                            {cashoutSettings.cex == "MAX" && (
                              <div className="mt-2 link" onClick={() => setTradeMAXModal(true)}>
                                {t("cashout-tradeMAX")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {expand == "cashback" && (
                <div className="space-y-3">
                  <p>{t("cashback-1")}</p>
                  <p>{t("cashback-2")}</p>
                  <p>{t("cashback-3")}</p>
                </div>
              )}
              {expand == "fees" && (
                <div className="space-y-3">
                  <p>{t("fees-1")}</p>
                  <p>{t("fees-2", { cex: cashoutSettings.cex ? tcommon(cashoutSettings.cex) : tcommon("aCEX") })}</p>
                  <p>
                    {paymentSettings.merchantCountry != "Other" && cashoutSettings.cex == "Coinbase" && (
                      <span>{t("fees-3cb", { merchantCurrency: paymentSettings.merchantCurrency })}</span>
                    )}
                    {cashoutSettings.cex == "MAX" && <span>{t("fees-3max")}</span>}
                    {((cashoutSettings.cex != "Coinbase" && cashoutSettings.cex != "MAX") || paymentSettings.merchantCountry == "Other") && <span>{t("fees-3none")}</span>}{" "}
                    <span className={`${paymentSettings.merchantCurrency == "USD" ? "hidden" : ""}`}>{t("fees-nonUSD-1")}</span>
                  </p>
                  <p className={`${paymentSettings.merchantCurrency == "USD" ? "hidden" : ""}`}>{t("fees-nonUSD-2", { merchantCurrency: paymentSettings.merchantCurrency })}</p>
                </div>
              )}
              {expand == "lose" && (
                <div className="space-y-3">
                  <p>{t("lose-1", { merchantCurrency: paymentSettings.merchantCurrency })}</p>
                  <p>{t("lose-2", { merchantCurrency: paymentSettings.merchantCurrency })}</p>
                  <p className="font-semibold">{t("lose-3")}:</p>
                  <p>
                    {t("lose-4", {
                      merchantCurrency: paymentSettings.merchantCurrency,
                      rate: currencyToExample[paymentSettings.merchantCurrency].rate,
                      localSent: currencyToExample[paymentSettings.merchantCurrency].localSent,
                    })}
                  </p>
                  {paymentSettings.merchantCurrency == "USD" && <p className="text-center">(10.00 * 0.98) / (0.90 * 0.997) = 10.9217 USDC </p>}
                  {paymentSettings.merchantCurrency == "EUR" && <p className="text-center">(10.00 * 0.98) / (0.90 * 0.997) = 10.9217 USDC </p>}
                  {paymentSettings.merchantCurrency == "TWD" && <p className="text-center">(1000 * 0.98) / (32 * 0.997) = 30.7172 USDC </p>}
                  <p>
                    {t("lose-5", {
                      merchantCurrency: paymentSettings.merchantCurrency,
                      rate: currencyToExample[paymentSettings.merchantCurrency].rate,
                      usdcReceived: currencyToExample[paymentSettings.merchantCurrency].usdcReceived,
                      localReceived: currencyToExample[paymentSettings.merchantCurrency].localReceived,
                      localReceivedIntended: currencyToExample[paymentSettings.merchantCurrency].localReceivedIntended,
                    })}
                  </p>
                  <p>{t("lose-6", { merchantCurrency: paymentSettings.merchantCurrency })}</p>
                </div>
              )}
              {expand == "rate" && (
                <div>
                  {paymentSettings.merchantCurrency == "USD" && <div>{t("rate-1USD")}</div>}
                  {paymentSettings.merchantCurrency != "USD" && (
                    <div>
                      {t("rate-1", {
                        merchantCurrency: paymentSettings.merchantCurrency,
                        cex: cashoutSettings.cex ? tcommon(cashoutSettings.cex) : tcommon("CEXes"),
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tradeMAXModal && <TradeMAXModal setTradeMAXModal={setTradeMAXModal} />}

      <div className="modalBlackout"></div>
    </div>
  );
};

export default Instructions;
