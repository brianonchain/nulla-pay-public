import dbConnect from "@/db/dbConnect";
import UserModel from "@/db/UserModel";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { keccak256, getAddress } from "viem";
import bcrypt from "bcryptjs";

export const POST = async (request: Request) => {
  console.log("/api/saveEmployeePass");
  const { employeePass, web3AuthInfo } = await request.json();

  // verify
  const prefix = ["0", "2", "4", "6", "8", "a", "c", "e"].includes(web3AuthInfo.publicKey.slice(-1)) ? "02" : "03"; // if y is even, then prefix is 02
  const publicKeyCompressed = prefix + web3AuthInfo.publicKey.substring(2).slice(0, -64); // substring(2) removes first 2 chars, slice(0, -64) removes last 64 chars
  const merchantEvmAddress = getAddress("0x" + keccak256(("0x" + web3AuthInfo.publicKey.substring(2)) as `0x${string}`).slice(-40)); // slice(-40) keeps last 40 chars
  const jwks = createRemoteJWKSet(new URL("https://api-auth.web3auth.io/jwks")); // for social logins
  const jwtDecoded = await jwtVerify(web3AuthInfo.idToken, jwks, { algorithms: ["ES256"] });
  const verified = (jwtDecoded.payload as any).wallets[2].public_key.toLowerCase() === publicKeyCompressed.toLowerCase();
  if (!verified) Response.json("not verified");

  try {
    await dbConnect();
    if (employeePass) {
      const hashedEmployeePass = await bcrypt.hash(employeePass, 10);
      await UserModel.findOneAndUpdate(
        { "paymentSettings.merchantEvmAddress": merchantEvmAddress },
        { hashedEmployeePass: hashedEmployeePass, "paymentSettings.hasEmployeePass": true }
      );
    } else {
      await UserModel.findOneAndUpdate({ "paymentSettings.merchantEvmAddress": merchantEvmAddress }, { hashedEmployeePass: "", "paymentSettings.hasEmployeePass": false });
    }
    return Response.json("saved");
  } catch (e) {
    return Response.json("error");
  }
};
