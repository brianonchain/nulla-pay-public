"use client";
// nextjs
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { getCookie } from "cookies-next";
// wagmi
import { useAccount, useConfig, useWalletClient, useDisconnect, useAccountEffect } from "wagmi";
// web3Auth
import { useWeb3Auth } from "@/app/provider/ContextProvider";
// others
import Pusher from "pusher-js";
import { getPublic, getPublicCompressed } from "@toruslabs/eccrypto";
import { QRCodeSVG } from "qrcode.react";
// components
import Login from "./_components/Login";
import Payments from "./_components/Payments";
import CashOut from "./_components/CashOut";
import Settings from "./_components/Settings";
import PWA from "./_components/PWA";
import Intro from "./_components/Intro";
import Instructions from "./_components/modals/FaqModal";
import MyQr from "./_components/modals/QrModal";
import { SpinningCircleGrayLarge } from "@/utils/components/SpinningCircleGray";
// constants
import { abb2full, countryData } from "@/utils/constants";
// images
import "@fortawesome/fontawesome-svg-core/styles.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { far } from "@fortawesome/free-regular-svg-icons";
import { faList, faFileInvoiceDollar, faGear } from "@fortawesome/free-solid-svg-icons";
// import PullToRefresh from "pulltorefreshjs";
// types
import { PaymentSettings, CashoutSettings, Transaction } from "@/db/models/UserModel";

const User = () => {
  console.log("/app, page.tsx rendered once");

  // in case if someone needs to redirect to /app page with specific menu tab
  const searchParams = useSearchParams();
  const menuTemp = searchParams.get("menu");

  // db values
  const [paymentSettingsState, setPaymentSettingsState] = useState<PaymentSettings | null>();
  const [cashoutSettingsState, setCashoutSettingsState] = useState<CashoutSettings | null>();
  const [transactionsState, setTransactionsState] = useState<Transaction[] | null>([]);
  // states
  const [menu, setMenu] = useState(menuTemp ?? "payments"); // "payments" | "cashOut" | "settings"
  const [page, setPage] = useState("loading"); // "loading" | "login" | "saveToHome" | "intro" | "app"
  // modals
  const [exchangeModal, setExchangeModal] = useState(false);
  const [signOutModal, setSignOutModal] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  // other
  const [isAdmin, setIsAdmin] = useState(true); // need to change to false
  const [isMobile, setIsMobile] = useState(false);
  const [browser, setBrowser] = useState<string>("Safari");
  // for verification
  const [idToken, setIdToken] = useState("");
  const [publicKey, setPublicKey] = useState("");

  const [isGettingDoc, setIsGettingDoc] = useState(true);
  const [reload, setReload] = useState(true);
  const [introModal, setIntroModal] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);

  // hooks
  const router = useRouter();
  const account = useAccount();
  const { data: walletClient } = useWalletClient();
  let web3Auth = useWeb3Auth();
  let config = useConfig();
  const { disconnectAsync } = useDisconnect();
  const initialized = useRef(false); //makes it so API runs once

  // if (isStandalone) {
  //   PullToRefresh.init({
  //     mainElement: "body",
  //     distReload: 60,
  //     onRefresh() {
  //       window.location.reload();
  //     },
  //     iconArrow: ReactDOMServer.renderToString(<FontAwesomeIcon icon={faSyncAlt} />),
  //     iconRefreshing: ReactDOMServer.renderToString(<FontAwesomeIcon icon={faSyncAlt} spin={true} />),
  //   });
  // }

  useAccountEffect({
    onConnect(data) {
      console.log("WAGMI Connected!", data);
    },
    onDisconnect() {
      console.log("WAGMI Disconnected!");
    },
  });

  // web3Auth?.on(ADAPTER_EVENTS.CONNECTED, (data: CONNECTED_EVENT_DATA) => {
  //   console.log("connected to wallet", data);
  //   console.log(walletClient ? "in event listener, no walletClient" : "in event listener, walletClient detected"); // will always return true
  // });
  // web3Auth?.on(ADAPTER_EVENTS.CONNECTING, () => {
  //   console.log("connecting");
  // });

  useEffect(() => {
    // setPage("intro");
    // return;
    console.log("/app, page.tsx, useEffect run once");

    // if mobile & not standalone, then redirect to "Save To Homescreen"
    const isMobileTemp = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); // need "temp" because using it inside this useEffect
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isMobileAndNotStandaloneTemp = isMobileTemp && !isStandalone ? true : false; // need "temp" because will be using it inside this useEffect
    console.log("useEffect, isMobileTemp:", isMobileTemp);
    setIsMobile(isMobileTemp);
    if (isMobileAndNotStandaloneTemp) {
      console.log("detected mobile & not standalone");
      // detect browser and redirect to "Save To Homescreen"
      const userAgent = navigator.userAgent;
      if (userAgent.match(/chrome|chromium|crios/i)) {
        setBrowser("Chrome");
      } else if (userAgent.match(/firefox|fxios/i)) {
        setBrowser("Firefox");
      } else if (userAgent.match(/safari/i)) {
        setBrowser("Safari");
      } else if (userAgent.match(/opr\//i)) {
        setBrowser("Opera");
      } else if (userAgent.match(/edg/i)) {
        setBrowser("Edge");
      } else if (userAgent.match(/samsungbrowser/i)) {
        setBrowser("Samsung");
      } else if (userAgent.match(/ucbrowser/i)) {
        setBrowser("UC");
      } else {
        setBrowser("");
      }
      // setPage("saveToHome");
      // console.log("page set to saveToHome");
      // return;
    }

    const jwt = getCookie("jwt");
    console.log(jwt);
    if (jwt) {
      verifyAndGetEmployeeData();

      return;
    }

    // query localStorage to determine user logged into web3Auth
    const sessionIdObject: any = window.localStorage.getItem("openlogin_store");
    if (!sessionIdObject || !JSON.parse(sessionIdObject).sessionId) {
      console.log("no web3Auth sessionId, page set to Login");
      setPage("login");
      return;
    }

    console.log("web3Auth.status:", web3Auth?.status ?? "web3Auth is null", "| web3Auth.connected:", web3Auth?.connected ?? "web3Auth is null");
    console.log("account.address:", account.address);
    // In general, all the above will show "undefined" in 1st useEffect run (thus, we query localStorage to determine if web3Auth
    // already connected). In 2nd run, web3Auth.status will show "connected", while account.address and walletClient will be undefined.
    // Web3Auth event listener will then show connecting and connected. /App page will then be rendered twice in a row (why???) but the useEffect
    // is only run once. In this 3rd run, account.address and walletClient will be detected.

    // prevent further work from being done if walletClient not loaded
    if (walletClient) {
      console.log("walletClient detected");
    } else {
      console.log("walletClient not detected");
      return;
    }

    // get user doc (w/ verification) || create new user
    if (!initialized.current) {
      initialized.current = true;
      verifyAndGetData();
      // subscribePusher();
    }
    console.log("/app, page.tsx, useEffect ended");
  }, [walletClient]);
  // if you use web3Auth in dependency array, web3Auth.status will show "connected" but walletClient will still be undefined
  // if you use wagmi's "account" in dependency array, will achieve workable results, but too many rerenders, as account changes more frequently than walletClient

  const verifyAndGetData = async () => {
    console.log("/app, verifyAndGetData() run once");

    // get idToken from web3Auth
    try {
      const userInfo = await web3Auth?.getUserInfo();
      var idTokenTemp = userInfo?.idToken;
      console.log("/app, useEffect, verifyAndGetData, userInfo", userInfo);
    } catch (e) {
      console.log("error: could not get web3Auth.userInfo, page set to Login");
      setPage("login");
    }

    // get publicKey from window
    try {
      if (!walletClient) {
        console.log("veryifyandGetData function, no walletClient");
        return;
      }
      const privateKey = (await walletClient?.request({
        // @ts-ignore
        method: "eth_private_key", // it somehow works even if not typed
      })) as string;
      var publicKeyTemp = getPublic(Buffer.from(privateKey?.padStart(64, "0"), "hex")).toString("hex");
    } catch (e) {
      console.log("error: could not get publicKey, page set to Login");
      setPage("login");
      return;
    }

    // get user doc (idToken and publicKey will be verified)
    if (idTokenTemp && publicKeyTemp) {
      setIdToken(idTokenTemp);
      setPublicKey(publicKeyTemp);

      try {
        //fetch doc
        console.log("fetching doc...");
        const res = await fetch("/api/getUserDoc", {
          method: "POST",
          body: JSON.stringify({ idToken: idTokenTemp, publicKey: publicKeyTemp }),
          headers: { "content-type": "application/json" },
        });
        const data = await res.json();
        console.log(data);
        // if success
        if (data.status == "success") {
          console.log("fetched doc and set states");
          // set states
          setPaymentSettingsState(data.doc.paymentSettings);
          setCashoutSettingsState(data.doc.cashoutSettings);
          setTransactionsState(data.doc.transactions);
          setIsAdmin(true);
          setPage("app");
        }
        // if new user
        if (data == "create new user") {
          createNewUser();
          setPage("intro");
        }
        // if error
        if (data.status == "error") {
          console.log(data);
          await disconnectAsync();
          setPage("login");
        }
      } catch (err) {
        console.log("error: api request to getUserDoc failed");
        await disconnectAsync();
        setPage("login");
      }
    }
  };

  const verifyAndGetEmployeeData = async () => {
    console.log("/app, verifyAndGetEmployeeData() run once");
    const res = await fetch("/api/getEmployeeData", {
      method: "GET",
      headers: { "content-type": "application/json" },
    });
    const data = await res.json();
    if (data.status == "success") {
      console.log("success");
      setTransactionsState(data.transactions);
      setPaymentSettingsState(data.paymentSettings);
      setIsAdmin(false);
      setPage("app");
    } else {
      console.log("employee login failed");
    }
  };

  const subscribePusher = async () => {
    // instantiate
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY ?? "", { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "" });
    pusher.connection.bind("error", (e: any) => {
      console.error("Pusher connection error:", e);
    });
    // ensure not double-subscribing
    let channels = await pusher.allChannels();
    let channelNames = channels.map((i) => i.name);
    if (!channelNames.includes(account.address ?? "")) {
      const channel = pusher.subscribe(account.address ?? "");
      channel.bind("payment-submitted", async (pusherData: any) => {
        const pusherCurrency = pusherData.currency;
        const pusherAmount = pusherData.amount;
        console.log("pusherData", pusherAmount, pusherCurrency);
        // fetch new transactionsState from db
        try {
          //fetch doc
          console.log("fetching doc...");
          const res = await fetch("/api/getUserDoc", {
            method: "POST",
            body: JSON.stringify({ merchantEvmAddress: account.address }),
            headers: { "content-type": "application/json" },
          });
          const data = await res.json();
          console.log(data);
          if (data.status == "success") {
            setTransactionsState(data.transactions);
          }
        } catch (error) {
          console.log("error: api request to getTransactions failed");
        }
      });
    }
  };

  const createNewUser = async () => {
    console.log("creating new user");
    // detect IP and set merchantCountry, merchantCurrency, and cex
    let merchantCountry: string;
    let merchantCurrency: string;
    let cex: string;
    try {
      const res = await axios.get("https://api.country.is");
      merchantCountry = abb2full[res.data.country] || "United States";
      merchantCurrency = countryData[merchantCountry]?.currency || "USD";
      cex = countryData[merchantCountry]?.CEXes[0] || "Coinbase";
      console.log("detected country, currency, and CEX:", merchantCountry, merchantCurrency, cex);
    } catch (err) {
      merchantCountry = "United States";
      merchantCurrency = "USD";
      cex = "Coinbase";
      console.log("detect country API failed", err);
    }
    // call createUser API (should have already passed verification)
    const merchantEmail = (await web3Auth?.getUserInfo())?.email || "";
    const merchantEvmAddress = account.address;
    console.log(merchantEvmAddress, merchantEmail, merchantCountry, merchantCurrency, cex);
    try {
      const res = await fetch("/api/createUser", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ merchantEvmAddress, merchantEmail, merchantCountry, merchantCurrency, cex }),
      });
      const docTemp = await res.json();
      console.log("page set to App, new user created, doc:", docTemp);
      setPaymentSettingsState(docTemp.paymentSettings);
      setCashoutSettingsState(docTemp.cashoutSettings);
    } catch (err) {
      console.log("page set to Login, request to create user api failed");
      setPage("login");
    }
  };

  return (
    <div className="pl-[calc(100vw-100%)] text-gray-800">
      {page === "loading" && (
        <div className="w-full h-screen flex flex-col justify-center items-center">
          <SpinningCircleGrayLarge />
          <div className="mt-2">Loading...</div>
        </div>
      )}
      {page === "saveToHome" && <PWA browser={browser} />}
      {page === "login" && <Login isMobile={isMobile} setPage={setPage} />}
      {page === "intro" && <Intro isMobile={isMobile} setPage={setPage} paymentSettingsState={paymentSettingsState} cashoutSettingsState={cashoutSettingsState} />}
      {page === "app" && (
        <div className="w-full h-screen flex portrait:flex-col-reverse landscape:flex-row">
          {/*---MENU: LEFT or BOTTOM (md 900px breakpoint) ---*/}
          <div className="portrait:w-full portrait:h-[84px] sm:portrait:h-[140px] landscape:w-[120px] md:landscape:w-[160px] landscape:h-screen flex landscape:flex-col justify-center items-center flex-none portrait:border-t landscape:border-r border-gray-300 relative">
            {/*--- logo ---*/}
            <div className="portrait:hidden landscape:block absolute top-6 lg:top-8 right-[calc(w-[100%]/2)]">
              <div className="relative w-[100px] h-[55px]">
                <Image src={"/logo.svg"} alt="logo" fill />
              </div>
            </div>
            {/*---menu---*/}
            <div
              className={`portrait:fixed portrait:bottom-0 landscape:static w-full portrait:h-[84px] sm:portrait:h-[140px] landscape:h-[56%] lg:landscape:h-[50%] landscape:space-y-8 flex items-center portrait:justify-around landscape:flex-col landscape:justify-between portrait:pb-3`}
            >
              {(isAdmin
                ? [
                    { id: "qrCode", title: "QR Code", img: "/qr.svg" },
                    { id: "payments", title: "Payments", img: "/payments.svg" },
                    { id: "cashOut", title: "Cash Out", img: "/cashout.svg" },
                    { id: "settings", title: "Settings", img: "/settings.svg" },
                  ]
                : [
                    { id: "payments", title: "Sign Out", img: "/signout.svg", modal: "signOutModal" },
                    { id: "qrCode", title: "QR Code", img: "/qr.svg" },
                    { id: "payments", title: "Search", img: "/search.svg", modal: "searchModal" },
                  ]
              ).map((i) => (
                <div
                  id={i.id}
                  key={i.id}
                  onClick={(e) => {
                    setMenu(e.currentTarget.id);
                    if (i.modal) {
                      if (i.modal == "signOutModal") {
                        setSignOutModal(true);
                      } else if (i.modal == "searchModal") {
                        setSearchModal(true);
                      }
                    }
                  }}
                  className={`${!isAdmin || menu === i.id ? "opacity-100" : "opacity-50"} cursor-pointer xs:hover:opacity-100 lg:w-auto flex flex-col items-center`}
                >
                  <div className="relative w-[66px] h-[22px] sm:h-[36px] point-events-none">
                    <Image src={i.img} alt={i.title} fill />
                  </div>
                  <div className="landscape:text-sm portrait:text-sm landscape:sm:text-lg portrait:sm:text-2xl landscape:md:text-2xl portrait:md:text-2xl  font-medium pointer-events-none">
                    {i.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/*---menu pages---*/}
          {menu === "payments" && (
            <Payments
              paymentSettingsState={paymentSettingsState!}
              transactionsState={transactionsState!}
              setTransactionsState={setTransactionsState}
              isAdmin={isAdmin}
              signOutModal={signOutModal}
              setSignOutModal={setSignOutModal}
              searchModal={searchModal}
              setSearchModal={setSearchModal}
              setPage={setPage}
            />
          )}
          {menu === "cashOut" && isAdmin && (
            <CashOut
              paymentSettingsState={paymentSettingsState!}
              cashoutSettingsState={cashoutSettingsState!}
              setCashoutSettingsState={setCashoutSettingsState}
              transactionsState={transactionsState}
              isMobile={isMobile}
              idToken={idToken}
              publicKey={publicKey}
            />
          )}
          {menu === "settings" && isAdmin && (
            <Settings
              paymentSettingsState={paymentSettingsState!}
              setPaymentSettingsState={setPaymentSettingsState}
              cashoutSettingsState={cashoutSettingsState!}
              setCashoutSettingsState={setCashoutSettingsState}
              isMobile={isMobile}
              idToken={idToken}
              publicKey={publicKey}
              exchangeModal={exchangeModal}
              setExchangeModal={setExchangeModal}
              setPage={setPage}
            />
          )}
          {menu === "qrCode" && (
            <div onClick={() => setMenu("payments")}>
              <div className="fixed inset-0 z-[10] bg-black">
                <div className="absolute bottom-[60px] w-full text-center text-base font-medium text-white z-[30]">Tap screen to exit</div>
              </div>
              <div className="portrait:w-full portrait:h-[calc(100vw*1.4142)] landscape:w-[calc(100vh/1.4142)] landscape:h-screen fixed inset-1/2 -translate-y-[50%] -translate-x-1/2 z-[20]">
                <div className="w-full h-full relative">
                  <Image src="/placard.svg" alt="placard" fill />
                </div>
              </div>
              <div className="fixed top-[50%] left-[50%] translate-y-[-50%] translate-x-[-50%] z-[20]">
                <QRCodeSVG
                  xmlns="http://www.w3.org/2000/svg"
                  size={window.innerWidth > window.innerHeight ? Math.round((window.innerHeight / 1.4142) * (220 / 424.26)) : Math.round(window.innerWidth * (220 / 424.26))}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"L"}
                  value={paymentSettingsState?.qrCodeUrl ?? ""}
                />
              </div>
            </div>
          )}
          {menu == "signOut" && (
            <div>
              <div className="modal">
                {/*---content---*/}
                <div className="mb-8 grow flex flex-col justify-center text-lg md:text-base text-center">{errorMsg}</div>
              </div>
              <div className="modalBlackout" onClick={() => setErrorModal(false)}></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default User;
