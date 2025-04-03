// ✅ app.js (최소 수정 버전)
import express from "express";
import fs from "fs";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.set("view engine", "ejs");

const VAULT_ADDR = process.env.VAULT_ADDR;
const TRANSIT_KEY_A = process.env.TRANSIT_KEY_TENANT_A;
const TRANSIT_KEY_B = process.env.TRANSIT_KEY_TENANT_B;
const TRANSIT_KEY_C = process.env.TRANSIT_KEY_TENANT_C;

async function vaultEncryptDecrypt(keyName, plaintext) {
  try {
    const encoded = Buffer.from(plaintext).toString("base64");

    const encRes = await axios.post(
      `${VAULT_ADDR}/v1/transit/encrypt/${keyName}`,
      { plaintext: encoded }
    );
    const ciphertext = encRes.data.data.ciphertext;

    const decRes = await axios.post(
      `${VAULT_ADDR}/v1/transit/decrypt/${keyName}`,
      { ciphertext }
    );
    const decrypted = Buffer.from(
      decRes.data.data.plaintext,
      "base64"
    ).toString("utf-8");

    return { ciphertext, decrypted };
  } catch (err) {
    return { error: err.message };
  }
}

app.get("/", (req, res) => {
  res.render("index", { results: null });
});

app.post("/encrypt", async (req, res) => {
  const inputText = req.body.text || "";

  const results = {
    tenantA: await vaultEncryptDecrypt(TRANSIT_KEY_A, inputText),
    tenantB: await vaultEncryptDecrypt(TRANSIT_KEY_B, inputText),
    tenantC: await vaultEncryptDecrypt(TRANSIT_KEY_C, inputText),
    agent: { note: "Proxy 모드에선 Agent 키는 사용하지 않음" },
  };

  res.render("index", { results });
});

app.listen(port, () => {
  console.log(`Vault 앱이 http://localhost:${port} 에서 실행 중입니다.`);
});
