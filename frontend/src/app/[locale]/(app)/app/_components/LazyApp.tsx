"use client";
// nextjs
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
// custom hooks
import { useQueryClient } from "@tanstack/react-query";
import { useWeb3AuthInfo } from "../../Web3AuthProvider";
import { useAccount } from "wagmi";
import { useTheme } from "next-themes";
// pusher
import Pusher from "pusher-js";
// components
import Navbar from "./Navbar";
import Notification from "./Notification";
import Payments from "./Payments";
const CashOut = dynamic(() => import("./Cashout")); // preloaded
const Settings = dynamic(() => import("./Settings")); // preloaded
const QrCodeModal = dynamic(() => import("./(payments)/QrCodeModal")); // preloaded
const CashbackModal = dynamic(() => import("./modals/CashbackModal"));
const TradeMAXModal = dynamic(() => import("./modals/exchanges/TradeMAXModal"));
import SignOutModal from "./modals/EmployeeSignOutModal";
// utils
import ErrorModal from "@/utils/components/ErrorModal";
// types
import { SettingsType, NullaInfo, AllRates } from "@/utils/types";
import { Transaction } from "@/db/UserModel";
// import PullToRefresh from "pulltorefreshjs";

export default function App({ nullaInfo, allRates, settings, isCbLinked }: { nullaInfo: NullaInfo; allRates: AllRates; settings: SettingsType; isCbLinked: boolean }) {
  console.log("(app)/app/_components/LazyApp.tsx");

  // hooks
  const web3AuthInfo = useWeb3AuthInfo();
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { setTheme } = useTheme();

  // states
  const [selectedMenu, setSelectedMenu] = useState("payments"); // "payments" | "cashout" | "settings"
  const [newTxn, setNewTxn] = useState<Transaction | null>(null);
  const [qrCodeModal, setQrCodeModal] = useState(false);
  const [cashbackModal, setCashbackModal] = useState(false);
  const [errorModal, setErrorModal] = useState<React.ReactNode>(null); // React.ReactNode includes string and null
  const [tradeMAXModal, setTradeMAXModal] = useState(false);
  const [signOutModal, setSignOutModal] = useState(false);

  // preload components 3s after first render
  useEffect(() => {
    function preload() {
      console.log("Cashout, Settings, QrCodeModal preload initiated");
      import("./Cashout");
      import("./Settings");
      import("./(payments)/QrCodeModal");
    }
    setTimeout(preload, 3000);
  }, []);

  // misc effects
  useEffect(() => {
    if (window.localStorage.getItem("cashbackModal")) setCashbackModal(true);
    // if user attempts to link cb, goToCashout should exist
    if (window.localStorage.getItem("goToCashout")) {
      window.localStorage.removeItem("goToCashout");
      setSelectedMenu("cashout");
    }
    if (!window.localStorage.getItem("theme")) setTheme("dark");
  }, []);

  // subscribe to pusher
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! });
    if (address) {
      if (!pusher.channel(address)) {
        pusher.connection.bind("error", (e: any) => {
          console.error("Pusher connection error:", e);
        }); // bind to "error" event
        var channel = pusher.subscribe(address); // 1. subscribes to channel with name equal to merchantEvmAddress
        channel.bind("payment", async ({ txn }: { txn: Transaction }) => {
          console.log("payment event detected, txn:", txn);
          queryClient.invalidateQueries({ queryKey: ["txns"] });
          setNewTxn(txn);
          setTimeout(() => {
            setNewTxn(null);
          }, 8000);
        });
        console.log("subscribed to channel:", address, "and listening to payment events");
      } else {
        console.log("Pusher: already subscribed to channel", address);
      }
    } else {
      console.log("address not detected, Pusher not subscribed");
    }

    return () => {
      console.log("Pusher disconnected");
      pusher.unbind("payment");
      pusher.disconnect();
    };
  }, []);

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

  return (
    <div className="w-full h-screen flex portrait:flex-col-reverse landscape:flex-row relative">
      <Navbar selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} setSignOutModal={setSignOutModal} />

      {/*---menu tabs---*/}
      {selectedMenu === "payments" && <Payments nullaInfo={nullaInfo} setErrorModal={setErrorModal} paymentSettings={settings.paymentSettings} />}
      {selectedMenu === "cashout" && web3AuthInfo && (
        <CashOut
          nullaInfo={nullaInfo}
          paymentSettings={settings.paymentSettings}
          cashoutSettings={settings.cashoutSettings}
          setErrorModal={setErrorModal}
          setTradeMAXModal={setTradeMAXModal}
          rates={allRates[settings.paymentSettings.merchantCurrency]}
          isCbLinked={isCbLinked}
        />
      )}
      {selectedMenu === "settings" && web3AuthInfo && (
        <Settings paymentSettings={settings.paymentSettings} cashoutSettings={settings.cashoutSettings} setErrorModal={setErrorModal} />
      )}

      {/*--- modals ---*/}
      {newTxn && <Notification paymentSettings={settings.paymentSettings} newTxn={newTxn} setNewTxn={setNewTxn} />}
      {errorModal && <ErrorModal setErrorModal={setErrorModal} errorModal={errorModal} />}
      {qrCodeModal && settings.paymentSettings && <QrCodeModal setQrCodeModal={setQrCodeModal} paymentSettings={settings.paymentSettings} />}
      {cashbackModal && <CashbackModal setCashbackModal={setCashbackModal} />}
      {tradeMAXModal && <TradeMAXModal setTradeMAXModal={setTradeMAXModal} />}
      {signOutModal && <SignOutModal setSignOutModal={setSignOutModal} />}
    </div>
  );
}
