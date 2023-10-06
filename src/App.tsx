/* eslint-disable @typescript-eslint/no-shadow */
import "./App.css";

import * as Sentry from "@sentry/react";
import type { SafeEventEmitterProvider } from "@web3auth/base";
import {
  COREKIT_STATUS,
  FactorKeyTypeShareDescription,
  mnemonicToKey,
  parseToken,
  TssShareType,
  WEB3AUTH_NETWORK,
  Web3AuthMPCCoreKit,
} from "@web3auth/mpc-core-kit";
import BN from "bn.js";
import { generatePrivate } from "eccrypto";
import { useEffect, useState } from "react";
import swal from "sweetalert";
import Web3 from "web3";
import type { provider } from "web3-core";

import AuthenticatorService from "./authenticatorService";
import { CustomFactorsModuleType } from "./constants";
import SmsPasswordless from "./smsService";
import { generateIdToken } from "./utils";

const uiConsole = (...args: any[]): void => {
  const el = document.querySelector("#console>p");
  if (el) {
    el.innerHTML = JSON.stringify(args || {}, null, 2);
  }
  console.log(...args);
};

function App() {
  const [loginResponse, setLoginResponse] = useState<any>(null);
  const [coreKitInstance, setCoreKitInstance] = useState<Web3AuthMPCCoreKit | null>(null);
  const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(null);
  const [web3, setWeb3] = useState<any>(null);
  const [mockVerifierId, setMockVerifierId] = useState<string | null>(null);
  const [showBackupPhraseScreen, setShowBackupPhraseScreen] = useState<boolean>(false);
  const [seedPhrase, setSeedPhrase] = useState<string>("");
  const [number, setNumber] = useState<string>("");

  useEffect(() => {
    if (!mockVerifierId) return;
    localStorage.setItem(`mockVerifierId`, mockVerifierId);
  }, [mockVerifierId]);

  useEffect(() => {
    let verifierId: string;

    const localMockVerifierId = localStorage.getItem("mockVerifierId");
    if (localMockVerifierId) verifierId = localMockVerifierId;
    else verifierId = `${Math.round(Math.random() * 100000)}@example.com`;
    setMockVerifierId(verifierId);
  }, []);

  useEffect(() => {
    const init = async () => {
      const coreKitInstance = new Web3AuthMPCCoreKit({
        web3AuthClientId: "torus-key-test",
        web3AuthNetwork: WEB3AUTH_NETWORK.MAINNET,
        uxMode: "popup",
      });
      await coreKitInstance.init();
      setCoreKitInstance(coreKitInstance);

      if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
      // if (window.location.hash.includes("#state")) {
      //   try {
      //     const provider = await coreKitInstance.handleRedirectResult();
      //     if (provider) setProvider(provider);
      //   } catch (error) {
      //     if ((error as Error).message === "required more shares") {
      //       setShowBackupPhraseScreen(true);
      //     } else {
      //       console.error(error);
      //       Sentry.captureException(error);
      //     }
      //   }
      // }
    };
    init();
  }, []);

  useEffect(() => {
    if (provider) {
      const web3 = new Web3(provider as provider);
      setWeb3(web3);
    }
  }, [provider]);

  const keyDetails = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    uiConsole(coreKitInstance.getKeyDetails());
  };

  const login = async (mockLogin: boolean) => {
    try {
      if (!coreKitInstance) {
        throw new Error("initiated to login");
      }

      uiConsole("Logging in...");

      const token = generateIdToken(mockVerifierId as string, "ES256");
      const parsedToken = parseToken(token);
      if (mockLogin) {
        await coreKitInstance.loginWithJWT({
          verifier: "torus-test-health",
          verifierId: parsedToken.email,
          idToken: token,
        });
      } else {
        await coreKitInstance.loginWithOauth({
          subVerifierDetails: {
            typeOfLogin: "google" as const,
            verifier: "mpc-demo-w3a",
            clientId: "774338308167-q463s7kpvja16l4l0kko3nb925ikds2p.apps.googleusercontent.com",
          },
        });
      }

      if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
    } catch (error: unknown) {
      if ((error as Error).message === "required more shares") {
        setShowBackupPhraseScreen(true);
      } else {
        console.error(error);
        Sentry.captureException(error);
      }
    }
  };

  const logout = async () => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance not found");
    }
    await coreKitInstance.logout();
    uiConsole("Log out");
    setProvider(null);
    setLoginResponse(null);
    await coreKitInstance.init();
  };

  const getUserInfo = (): void => {
    const user = coreKitInstance?.getUserInfo();
    uiConsole(user);
  };

  const getLoginResponse = (): void => {
    uiConsole(loginResponse);
  };

  const exportShare = async (): Promise<void> => {
    if (!provider) {
      throw new Error("provider is not set.");
    }
    const share = await coreKitInstance?.createFactor({
      shareType: TssShareType.RECOVERY,
    });
    uiConsole(share);
  };

  const submitBackupShare = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }
    if (!seedPhrase) {
      throw new Error("seedPhrase is not set");
    }
    const key = mnemonicToKey(seedPhrase);
    await coreKitInstance.inputFactorKey(new BN(key));
    uiConsole("submitted");
    if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
  };

  const setupSmsRecovery = async (): Promise<void> => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }
      if (!coreKitInstance.tKey.privKey) {
        throw new Error("user is not logged in, tkey is not reconstructed yet.");
      }

      // get the tkey address
      const { privKey } = coreKitInstance.tKey;

      // check if we are setting up the sms recovery for the first time.
      // share descriptions contain the details of all the factors/ shares you set up for the user.
      const shareDescriptions = Object.values(coreKitInstance.getKeyDetails().shareDescriptions).map((i) => ((i || [])[0] ? JSON.parse(i[0]) : {}));
      // for sms otp, we have set up a custom share/ factor with module type as "mobile_sms" defined in CustomFactorsModuleType.MOBILE_SMS in this example.
      const shareDescriptionsMobile = shareDescriptions.find((shareDescription) => shareDescription.module === CustomFactorsModuleType.MOBILE_SMS);
      if (shareDescriptionsMobile) {
        console.log("sms recovery already setup");
        uiConsole("sms console already setup");
        return;
      }

      const result = await SmsPasswordless.registerSmsOTP(privKey, number);
      uiConsole("please use this code to verify your phone number", result);
      console.log("otp code", result);

      const verificationCode = await swal("Enter your backup share, please enter the correct code first time :)", {
        content: "input" as any,
      }).then((value) => {
        return value;
      });

      if (!verificationCode || verificationCode.length !== 6) {
        console.error("Invalid verification code entered");
        uiConsole("Invalid verification code entered");
      }
      const { metadataPubKey: pubKey } = coreKitInstance.getKeyDetails();
      const address = `${pubKey.x.toString(16, 64)}${pubKey.y.toString(16, 64)}`;
      const newBackUpFactorKey = new BN(generatePrivate());
      await SmsPasswordless.addSmsRecovery(address, verificationCode, newBackUpFactorKey);

      // setup the sms recovery factor key and share in tkey.
      // for sms otp, we have set up a custom share/ factor with module type as "mobile_sms" defined in CustomFactorsModuleType.MOBILE_SMS in this example.
      await coreKitInstance.createFactor({
        factorKey: newBackUpFactorKey,
        shareDescription: FactorKeyTypeShareDescription.Other,
        shareType: TssShareType.RECOVERY,
        additionalMetadata: {
          authenticator: "sms",
          mobile: number,
        },
      });
      // await coreKitInstance.addCustomShare(newBackUpFactorKey, { module: CustomFactorsModuleType.MOBILE_SMS, number });
      uiConsole("sms recovery setup complete");
    } catch (error: unknown) {
      console.error(error);
      Sentry.captureException(error);
      uiConsole((error as Error).message);
    }
  };

  const recoverViaNumber = async (): Promise<void> => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }

      const keyDetails = coreKitInstance.getKeyDetails();
      if (!keyDetails) {
        throw new Error("keyDetails is not set");
      }

      // check if we are setting up the sms recovery for the first time.
      // share descriptions contain the details of all the factors/ shares you set up for the user.
      const shareDescriptions = Object.values(keyDetails.shareDescriptions).map((i) => ((i || [])[0] ? JSON.parse(i[0]) : {}));
      // for sms otp, we have set up a custom share/ factor with module type as "mobile_sms" defined in CustomFactorsModuleType.MOBILE_SMS in this example.
      const shareDescriptionsMobile = shareDescriptions.find((shareDescription) => shareDescription.module === CustomFactorsModuleType.MOBILE_SMS);
      if (!shareDescriptionsMobile) {
        console.error("sms recovery not setup");
        uiConsole("sms recovery not setup");
      }

      console.log("sms recovery already setup", shareDescriptionsMobile);

      const { number } = shareDescriptionsMobile;
      const { metadataPubKey: pubKey } = keyDetails;
      const address = `${pubKey.x.toString(16, 64)}${pubKey.y.toString(16, 64)}`;
      const result = await SmsPasswordless.requestSMSOTP(address);
      uiConsole("please use this code to verify your phone number", number, "code", result);
      console.log("otp code", result);

      const verificationCode = await swal("Enter your backup share, please enter the correct code first time :)", {
        content: "input" as any,
      }).then((value) => {
        return value;
      });

      if (!verificationCode || verificationCode.length !== 6) {
        console.error("Invalid verification code entered");
        uiConsole("Invalid verification code entered");
      }

      const backupFactorKey = await SmsPasswordless.verifySMSOTPRecovery(address, verificationCode);
      if (!backupFactorKey) {
        throw new Error("Invalid verification code entered");
      }
      await coreKitInstance.inputFactorKey(backupFactorKey);
      if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
    } catch (error: unknown) {
      console.error(error);
      uiConsole((error as Error).message);
      Sentry.captureException(error);
    }
  };

  const setupAuthenticatorRecovery = async (): Promise<void> => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }
      if (coreKitInstance.status !== COREKIT_STATUS.LOGGED_IN) {
        throw new Error("user is not logged in, tkey is not reconstructed yet.");
      }

      // get the tkey address
      const { privKey } = coreKitInstance.tKey;

      // check if we are setting up the sms recovery for the first time.
      // share descriptions contain the details of all the factors/ shares you set up for the user.
      const shareDescriptions = Object.values(coreKitInstance.getKeyDetails().shareDescriptions).map((i) => ((i || [])[0] ? JSON.parse(i[0]) : {}));
      // for authenticator, we have set up a custom share/ factor with module type as "authenticator" defined in CustomFactorsModuleType.AUTHENTICATOR in this example.
      const shareDescriptionsMobile = shareDescriptions.find((shareDescription) => shareDescription.module === CustomFactorsModuleType.AUTHENTICATOR);
      if (shareDescriptionsMobile) {
        console.log("authenticator recovery already setup");
        uiConsole("authenticator recovery already setup");
        return;
      }

      const secretKey = AuthenticatorService.generateSecretKey();
      await AuthenticatorService.register(privKey, secretKey);
      uiConsole("please use this secret key to enter any authenticator app like google", secretKey);
      console.log("secret key", secretKey);

      const verificationCode = await swal(
        `Enter your authenticator code for this secret key: ${secretKey}, please enter the correct code first time :)`,
        {
          content: "input" as any,
        }
      ).then((value) => {
        return value;
      });

      if (!verificationCode) {
        console.error("Invalid verification code entered");
        uiConsole("Invalid verification code entered");
      }
      const { metadataPubKey: pubKey } = coreKitInstance.getKeyDetails();
      const address = `${pubKey.x.toString(16, 64)}${pubKey.y.toString(16, 64)}`;
      const newBackUpFactorKey = new BN(generatePrivate());
      await AuthenticatorService.addAuthenticatorRecovery(address, verificationCode, newBackUpFactorKey);

      // setup the authenticator recovery factor key and share in tkey.
      // for authenticator, we have set up a custom share/ factor with module type as "authenticator" defined in CustomFactorsModuleType.AUTHENTICATOR in this example.
      // for security reasons, we do not store the secret key in tkey.
      await coreKitInstance.createFactor({
        factorKey: newBackUpFactorKey,
        shareType: TssShareType.RECOVERY,
        shareDescription: FactorKeyTypeShareDescription.Other,
        additionalMetadata: {
          authenticator: "authenticator",
        },
      });
      uiConsole("authenticator recovery setup complete");
    } catch (error: unknown) {
      console.error(error);
      Sentry.captureException(error);
      uiConsole((error as Error).message);
    }
  };

  const recoverViaAuthenticatorApp = async (): Promise<void> => {
    try {
      if (!coreKitInstance) {
        throw new Error("coreKitInstance is not set");
      }

      const keyDetails = coreKitInstance.getKeyDetails();
      if (!keyDetails) {
        throw new Error("keyDetails is not set");
      }

      // check if we are setting up the sms recovery for the first time.
      // share descriptions contain the details of all the factors/ shares you set up for the user.
      const shareDescriptions = Object.values(keyDetails.shareDescriptions).map((i) => ((i || [])[0] ? JSON.parse(i[0]) : {}));
      // for authenticator, we have set up a custom share/ factor with module type as "authenticator" defined in CustomFactorsModuleType.AUTHENTICATOR in this example.
      const shareDescriptionsMobile = shareDescriptions.find((shareDescription) => shareDescription.module === CustomFactorsModuleType.AUTHENTICATOR);
      if (!shareDescriptionsMobile) {
        console.error("authenticator recovery not setup");
        uiConsole("authenticator recovery not setup");
      }

      console.log("authenticator recovery already setup", shareDescriptionsMobile);

      const { metadataPubKey: pubKey } = keyDetails;
      const address = `${pubKey.x.toString(16, 64)}${pubKey.y.toString(16, 64)}`;

      const verificationCode = await swal("Enter your authenticator code, please enter the correct code first time :)", {
        content: "input" as any,
      }).then((value) => {
        return value;
      });

      if (!verificationCode) {
        console.error("Invalid verification code entered");
        uiConsole("Invalid verification code entered");
      }

      const backupFactorKey = await AuthenticatorService.verifyAuthenticatorRecovery(address, verificationCode);
      if (!backupFactorKey) {
        throw new Error("Invalid verification code entered");
      }
      await coreKitInstance.inputFactorKey(backupFactorKey);
      if (coreKitInstance.provider) setProvider(coreKitInstance.provider);
    } catch (error: unknown) {
      console.error(error);
      uiConsole((error as Error).message);
      Sentry.captureException(error);
    }
  };

  const getChainID = async () => {
    if (!web3) {
      return;
    }
    const chainId = await web3.eth.getChainId();
    uiConsole(chainId);
    return chainId;
  };

  const deleteLocalStore = () => {
    localStorage.removeItem("corekit_store");
    uiConsole("local tkey share deleted, pls logout.");
  };

  const getAccounts = async () => {
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
    const address = (await web3.eth.getAccounts())[0];
    uiConsole(address);
    return address;
  };

  const getBalance = async () => {
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
    const address = (await web3.eth.getAccounts())[0];
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(address) // Balance is in wei
    );
    uiConsole(balance);
    return balance;
  };

  const signMessage = async (): Promise<any> => {
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
    const fromAddress = (await web3.eth.getAccounts())[0];
    const originalMessage = [
      {
        type: "string",
        name: "fullName",
        value: "Satoshi Nakamoto",
      },
      {
        type: "uint32",
        name: "userId",
        value: "1212",
      },
    ];
    const params = [originalMessage, fromAddress];
    const method = "eth_signTypedData";
    const signedMessage = await (web3.currentProvider as any)?.sendAsync({
      id: 1,
      method,
      params,
      fromAddress,
    });
    uiConsole(signedMessage);
  };

  const resetAccount = async (): Promise<void> => {
    if (!coreKitInstance) {
      throw new Error("coreKitInstance is not set");
    }

    // await coreKitInstance.CRITICAL_resetAccount();
    uiConsole("reset");
    setLoginResponse(null);
    setProvider(null);
    setShowBackupPhraseScreen(false);
  };

  const sendTransaction = async () => {
    if (!web3) {
      console.log("web3 not initialized yet");
      return;
    }
    const fromAddress = (await web3.eth.getAccounts())[0];

    const destination = "0x2E464670992574A613f10F7682D5057fB507Cc21";
    const amount = web3.utils.toWei("0.0001"); // Convert 1 ether to wei

    // Submit transaction to the blockchain and wait for it to be mined
    uiConsole("Sending transaction...");
    const receipt = await web3.eth.sendTransaction({
      from: fromAddress,
      to: destination,
      value: amount,
    });
    uiConsole(receipt);
  };

  const loggedInView = (
    <>
      <h2 className="subtitle">Account Details</h2>
      <div className="flex-container">
        <button onClick={getUserInfo} className="card">
          Get User Info
        </button>

        <button onClick={getLoginResponse} className="card">
          See Login Response
        </button>

        <button onClick={keyDetails} className="card">
          Key Details
        </button>

        <button onClick={deleteLocalStore} className="card">
          Delete local store (enables Recovery Flow)
        </button>

        <button onClick={resetAccount} className="card">
          Reset Account
        </button>

        <button onClick={logout} className="card">
          Log Out
        </button>
      </div>
      <h2 className="subtitle">Recovery/ Key Manipulation</h2>
      <div className="flex-container">
        <button onClick={exportShare} className="card">
          Export backup share
        </button>

        <hr />
        <input placeholder={"Enter number +{cc}-{number}"} value={number} onChange={(e) => setNumber(e.target.value)}></input>
        <button onClick={setupSmsRecovery} className="card">
          Setup SMS Recovery
        </button>
        <button onClick={setupAuthenticatorRecovery} className="card">
          Setup Authenticator
        </button>
      </div>
      <h2 className="subtitle">Blockchain Calls</h2>
      <div className="flex-container">
        <button onClick={getChainID} className="card">
          Get Chain ID
        </button>

        <button onClick={getAccounts} className="card">
          Get Accounts
        </button>

        <button onClick={getBalance} className="card">
          Get Balance
        </button>

        <button onClick={signMessage} className="card">
          Sign Message
        </button>

        <button onClick={sendTransaction} className="card">
          Send Transaction
        </button>
      </div>

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );

  const unloggedInView = (
    <>
      {!showBackupPhraseScreen && (
        <>
          <button onClick={() => login(false)} className="card">
            Login
          </button>
          <button onClick={() => login(true)} className="card">
            MockLogin
          </button>
        </>
      )}

      <p>Mock Login Seed Email</p>
      <input value={mockVerifierId as string} onChange={(e) => setMockVerifierId(e.target.value)}></input>

      {showBackupPhraseScreen && (
        <>
          <textarea value={seedPhrase as string} onChange={(e) => setSeedPhrase(e.target.value)}></textarea>
          <button onClick={submitBackupShare} className="card">
            Submit backup share
          </button>
          <hr />
          OR
          <hr />
          <button onClick={recoverViaNumber} className="card">
            Recover using phone number
          </button>
          <button onClick={recoverViaAuthenticatorApp} className="card">
            Recover using Authenticator
          </button>
          <button onClick={resetAccount} className="card">
            Reset Account
          </button>
          <div id="console" style={{ whiteSpace: "pre-line" }}>
            <p style={{ whiteSpace: "pre-line" }}></p>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="https://web3auth.io/docs/guides/mpc" rel="noreferrer">
          Web3Auth Core Kit tKey MPC Beta
        </a>{" "}
        & ReactJS Ethereum Example
      </h1>

      <div className="grid">{provider ? loggedInView : unloggedInView}</div>

      <footer className="footer">
        <a href="https://github.com/Web3Auth/mpc-core-kit-demo" target="_blank" rel="noopener noreferrer">
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
