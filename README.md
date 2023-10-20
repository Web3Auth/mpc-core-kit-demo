# MPC Core Kit Demo with SMS OTP, Authenticator App and more

[![Web3Auth](https://img.shields.io/badge/Web3Auth-SDK-blue)](https://web3auth.io/docs/sdk/tkey)
[![Web3Auth](https://img.shields.io/badge/Web3Auth-Community-cyan)](https://community.web3auth.io)

[Join our Community Portal](https://community.web3auth.io/) to get support and stay up to date with the latest news and updates.

## How to Use

### Install Dependencies

```
 npm install
```

### Run Frontend with Example Cloud Setup

Rename .env.example.cloud to .env

```
npm run start
```

### Run Frontend with Local Docker Setup

This setup and repo is private, [reach out to us](https://calendly.com/web3auth/meeting-with-web3auth) for access to the repo.

Follow instructions on the backend repo before proceeding.

Rename .env.example.local to .env

```
npm run start
```

### To fix prettier problem

Try running `npx prettier --write .` on your project's directory.

### How to recover

If you enabled MFA option after you logged in, you will need to proceed recovery logic to get your account back.
There are couple of ways to recover the account.
You can recover using any of the methods you used for setup.
After successfully recover, factor Key will automatically loaded to the input field.
Just press Input Factor Key to recover.

## Important Links

- [Website](https://web3auth.io)
- [Docs](https://web3auth.io/docs)
- [Guides](https://web3auth.io/docs/guides)
- [SDK / API References](https://web3auth.io/docs/sdk)
- [Pricing](https://web3auth.io/pricing.html)
- [Community Portal](https://community.web3auth.io)
