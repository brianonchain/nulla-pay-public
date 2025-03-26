import dbConnect from "@/db/dbConnect";
import UserModel from "@/db/UserModel";
import * as jose from "jose";
import { keccak256, getAddress } from "viem";

export const POST = async (request: Request) => {
  console.log("/api/saveSettingsBulk");
  const { paymentSettings, cashoutSettings, idToken, publicKey } = await request.json();
  await dbConnect();

  // compute publicKeyCompressed and merchantEvmAddress from publicKey
  const prefix = ["0", "2", "4", "6", "8", "a", "c", "e"].includes(publicKey.slice(-1)) ? "02" : "03"; // if y is even, then prefix is 02
  const publicKeyCompressed = prefix + publicKey.substring(2).slice(0, -64); // substring(2) removes first 2 chars, slice(0, -64) removes last 64 chars
  const merchantEvmAddress = getAddress("0x" + keccak256(Buffer.from(publicKey.substring(2), "hex")).slice(-40)); // slice(-40) keeps last 40 chars

  // verify
  const jwks = jose.createRemoteJWKSet(new URL("https://api-auth.web3auth.io/jwks")); // for social logins
  const jwtDecoded = await jose.jwtVerify(idToken, jwks, { algorithms: ["ES256"] });
  const verified = (jwtDecoded.payload as any).wallets[2].public_key.toLowerCase() === publicKeyCompressed.toLowerCase();

  // save to db
  if (verified) {
    try {
      await UserModel.findOneAndUpdate({ "paymentSettings.merchantEvmAddress": merchantEvmAddress }, { paymentSettings: paymentSettings, cashoutSettings: cashoutSettings });
      console.log("saved");
      return Response.json("saved");
    } catch (e: any) {
      console.log("failed");
      return Response.json("failed");
    }
  } else {
    console.log("not verified");
    return Response.json("not verified");
  }
};
