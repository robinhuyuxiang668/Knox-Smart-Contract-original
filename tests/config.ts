import { PublicKey } from "@solana/web3.js";

export type EnvName = "DEV" | "LOCAL" | "MAIN";
export interface TestingConfig {
  name: EnvName;
  url: string;
  programId: PublicKey;
  cmmppProgram: PublicKey;
  raydiumAmmConfig: PublicKey;
}

export const LOCALNET_CONFIG: TestingConfig = {
  name: "LOCAL",
  url: "http://127.0.0.1:8899",
  programId: new PublicKey("EyvgnsuJ3hGG2TiHaabz7zg2CdX1TPnRmw7M92ZgvfVQ"),
  cmmppProgram: new PublicKey("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"),
  raydiumAmmConfig: new PublicKey(
    "D4FPEruKEHrG5TenZ2mpDGEfu1iUvTiqBxvpU8HLBvC2"
  ),
};

export const DEVNET_CONFIG: TestingConfig = {
  name: "DEV",
  url: "https://api.devnet.solana.com",
  programId: new PublicKey("GiKGBhyg7fSGrc1sBA9G4qCSr4aZAtrpkYgvBCP96zZM"),
  cmmppProgram: new PublicKey("CPMDWBwJDtYax9qW7AyRuVC19Cc4L4Vcy4n2BHAbHkCW"),
  raydiumAmmConfig: new PublicKey(
    "9zSzfkYy6awexsHvmggeH36pfVUdDGyCcwmjT3AQPBj6"
  ),
};
