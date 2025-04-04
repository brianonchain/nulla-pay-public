import dbConnect from "@/db/dbConnect";
import UserModel from "@/db/UserModel";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { keccak256, getAddress } from "viem";
import { NextRequest } from "next/server";
import { Filter } from "@/utils/types";

export const POST = async (request: NextRequest) => {
  const { web3AuthInfo, nullaInfo, pageParam, filter } = await request.json();
  console.log("entered /api/getPayments, pageParam:", pageParam, "filter:", filter);

  let verified = false;
  if (nullaInfo.userType === "owner") {
    const prefix = ["0", "2", "4", "6", "8", "a", "c", "e"].includes(web3AuthInfo.publicKey.slice(-1)) ? "02" : "03"; // if y is even, then prefix is 02
    const publicKeyCompressed = prefix + web3AuthInfo.publicKey.substring(2).slice(0, -64); // substring(2) removes first 2 chars, slice(0, -64) removes last 64 chars
    var merchantEvmAddress = getAddress("0x" + keccak256(("0x" + web3AuthInfo.publicKey.substring(2)) as `0x${string}`).slice(-40)); // slice(-40) keeps last 40 chars
    const jwks = createRemoteJWKSet(new URL("https://api-auth.web3auth.io/jwks")); // for social logins
    const jwtDecoded = await jwtVerify(web3AuthInfo.idToken, jwks, { algorithms: ["ES256"] });
    verified = (jwtDecoded.payload as any).wallets[2].public_key.toLowerCase() === publicKeyCompressed.toLowerCase();
  } else if (nullaInfo.userType === "employee") {
    const employeeJwt = request.cookies.get("userJwt")?.value ?? "";
    const secret = new TextEncoder().encode(process.env.JWT_KEY!); // format secret
    var {
      payload: { merchantEvmAddress },
    }: { payload: { merchantEvmAddress: `0x${string}` } } = await jwtVerify(employeeJwt, secret, {}); // verify token
    verified = merchantEvmAddress ? true : false;
  } else {
    return Response.json("not verified");
  }
  if (!verified) return Response.json("not verified");

  try {
    await dbConnect();
    if (filter.last4Chars || filter.refunded || filter.toRefund || filter.searchDate.to) {
      // create filter
      let matchFilter: any = {};
      if (filter.last4Chars) matchFilter["transactions.customerAddress"] = { $regex: `(?i)${filter.last4Chars}$` };
      if (filter.toRefund) matchFilter["transactions.toRefund"] = true;
      if (filter.refunded) matchFilter["transactions.refund"] = { $ne: "" };
      if (filter.searchDate.to) {
        let toDate = new Date(filter.searchDate.to);
        toDate.setDate(toDate.getDate() + 1); // add 24h to toDate
        matchFilter["transactions.date"] = { $gte: new Date(filter.searchDate.from), $lt: toDate };
      }
      // query txn with filter
      var txns = await UserModel.aggregate()
        .match({ "paymentSettings.merchantEvmAddress": merchantEvmAddress })
        .unwind("$transactions")
        .match(matchFilter)
        .sort({ "transactions._id": -1 })
        .skip(pageParam * 10)
        .limit(10)
        .project({ _id: 0, transactions: 1 })
        .replaceRoot("transactions");
    } else {
      // if no filter
      var txns = await UserModel.aggregate()
        .match({ "paymentSettings.merchantEvmAddress": merchantEvmAddress })
        .unwind("$transactions")
        .sort({ "transactions._id": -1 })
        .skip(pageParam * 10)
        .limit(10)
        .project({ _id: 0, transactions: 1 })
        .replaceRoot("transactions");
    }
    if (txns) {
      return Response.json({ status: "success", data: txns });
    } else {
      return Response.json("create new user");
    }
  } catch (e) {
    console.log(e);
    return Response.json("error");
  }
};
