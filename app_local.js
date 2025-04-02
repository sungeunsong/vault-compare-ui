import express from "express";
import fs from "fs";
import path from "path";
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
const VAULT_TOKEN = process.env.VAULT_TOKEN;
const TRANSIT_KEY_A = process.env.TRANSIT_KEY_TENANT_A;
const TRANSIT_KEY_B = process.env.TRANSIT_KEY_TENANT_B;
const AGENT_KEY_PATH = process.env.AGENT_KEY_PATH || "/vault/secrets/key.txt";

async function vaultEncryptDecrypt(keyName, plaintext) {
  try {
    const encoded = Buffer.from(plaintext).toString("base64");

    const encRes = await axios.post(
      `${VAULT_ADDR}/v1/transit/encrypt/${keyName}`,
      { plaintext: encoded },
      { headers: { "X-Vault-Token": VAULT_TOKEN } }
    );
    const ciphertext = encRes.data.data.ciphertext;

    const decRes = await axios.post(
      `${VAULT_ADDR}/v1/transit/decrypt/${keyName}`,
      { ciphertext },
      { headers: { "X-Vault-Token": VAULT_TOKEN } }
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
    tenantA: { ciphertext: "", decrypted: "", error: "" },
    tenantB: { ciphertext: "", decrypted: "", error: "" },
    agent: { key: "", encrypted: "", decrypted: "", error: "" },
  };

  // 1. Transit - tenant A
  results.tenantA = await vaultEncryptDecrypt(TRANSIT_KEY_A, inputText);

  // 2. Transit - tenant B
  results.tenantB = await vaultEncryptDecrypt(TRANSIT_KEY_B, inputText);

  // 3. Agent 방식 - 파일에서 키 읽기
  // try {
  //   const key = fs.readFileSync(AGENT_KEY_PATH, "utf-8").trim();
  //   const encrypted = Buffer.from(`${inputText}:${key}`).toString("base64");
  //   const decrypted = Buffer.from(encrypted, "base64").toString("utf-8");
  //   results.agent = { key, encrypted, decrypted };
  // } catch (e) {
  //   results.agent = { error: "Agent key 파일을 읽을 수 없음" };
  // }

  res.render("index", { results });
});

app.listen(port, () => {
  console.log(`Vault 비교 앱이 http://localhost:${port} 에서 실행 중입니다.`);
});
