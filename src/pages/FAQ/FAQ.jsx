import { useState } from 'react'
import styles from './FAQ.module.css'

const faqData = [
    {
        id: 'about',
        question: 'What is NdeFPL.com?',
        answer: `<p><strong>NdeFPL</strong> is an all-in-one Fantasy Premier League (FPL) platform that combines <strong>FPL data analytics</strong>, <strong>AI features</strong>, and a <strong>Web3 ecosystem</strong> into a single application.</p>
<div class="${styles.featureGrid}">
    <div class="${styles.featureItem}"><div><strong>Data & FPL Analytics</strong><p>Live Scores, Fixtures, Player Stats, Price Changes, Standings, and My Team — all the latest FPL data directly from the official Premier League API.</p></div></div>
    <div class="${styles.featureItem}"><div><strong>AI-Powered Features</strong><p>Captain Picks, Match Predictions, GW Summary, Transfer Suggestions — powered by Gemini AI for in-depth analysis.</p></div></div>
    <div class="${styles.featureItem}"><div><strong>Premium Analytics</strong><p>Differentials Finder, Injury Alerts, Form×Fixture Matrix, Ownership & EO, Crypto Charts with RSI & MACD.</p></div></div>
    <div class="${styles.featureItem}"><div><strong>Web3 Ecosystem</strong><p>NDESO token on Base chain, DEX Swap, Liquidity Pool, Staking with Fixed APY, and a blockchain-based premium subscription system.</p></div></div>
</div>
<p><strong>Free</strong> features (Dashboard, Live Scores, Fixtures, Players, etc.) can be accessed without login. <strong>Premium</strong> features require an active subscription via NDESO token.</p>`,
    },
    {
        id: 'wallet',
        question: 'How do I connect my digital wallet?',
        answer: `<p>To access Web3 features (Subscribe, Swap, Staking), you need to <strong>connect your wallet</strong> first.</p>
<div class="${styles.stepList}">
    <div class="${styles.step}"><strong>Prepare Your Wallet</strong><p>Make sure you already have a crypto wallet such as <strong>MetaMask</strong>, <strong>Coinbase Wallet</strong>, <strong>Rainbow</strong>, or any other wallet that supports <strong>Base chain</strong>.</p></div>
    <div class="${styles.step}"><strong>Click the Connect Button</strong><p>In the top right corner of the page, click the <strong>"Connect Wallet"</strong> button. A popup will appear showing the available wallet options.</p></div>
    <div class="${styles.step}"><strong>Select Your Wallet</strong><p>Choose the wallet you use. If using MetaMask, make sure the extension is installed in your browser. For mobile, you can use WalletConnect.</p></div>
    <div class="${styles.step}"><strong>Approve the Connection</strong><p>Your wallet will ask for permission to connect to NdeFPL. Click <strong>"Connect"</strong> or <strong>"Approve"</strong> in your wallet.</p></div>
    <div class="${styles.step}"><strong>Ensure Base Network</strong><p>NdeFPL runs on <strong>Base Mainnet</strong> (Chain ID: 8453). If your wallet is not on the Base network, the system will automatically prompt you to switch networks.</p></div>
</div>
<div class="${styles.tipBox}"><strong>Tips:</strong> After connecting, your wallet address will appear in the top right corner. You can disconnect at any time by clicking your wallet avatar.</div>`,
    },
    {
        id: 'subscribe',
        question: 'How do I subscribe to premium?',
        answer: `<p>A premium subscription unlocks access to all AI and Analytics features for <strong>30 days</strong>. Payment is made using <strong>NDESO</strong> token on Base chain.</p>
<div class="${styles.stepList}">
    <div class="${styles.step}"><strong>Connect Wallet</strong><p>Make sure your wallet is connected and on <strong>Base Mainnet</strong>.</p></div>
    <div class="${styles.step}"><strong>Prepare NDESO Tokens</strong><p>Ensure you have enough <strong>NDESO</strong> balance in your wallet. The subscription price is displayed on the Subscribe page. If you don't have NDESO yet, you can buy it through the <strong>Swap</strong> menu.</p></div>
    <div class="${styles.step}"><strong>Open the Subscribe Page</strong><p>Navigate to the <strong>Subscribe</strong> menu in the sidebar. Here you can see the plan details, pricing, and included features.</p></div>
    <div class="${styles.step}"><strong>Approve & Subscribe</strong><p>Click the <strong>"Approve & Subscribe"</strong> button. This process requires 2 transactions:</p><ul><li><strong>Approve</strong> — allows the smart contract to use your NDESO tokens</li><li><strong>Pay</strong> — processes the subscription payment</li></ul></div>
    <div class="${styles.step}"><strong>Premium Active!</strong><p>After the transaction succeeds, premium will be <strong>active immediately for 30 days</strong>. You can start accessing all AI and Analytics features.</p></div>
</div>
<div class="${styles.tipBox}"><strong>Tips:</strong> To use AI features, you also need to enter your <strong>Gemini API Key</strong> in Settings (gear icon in the header). The API key is free from Google AI Studio.</div>`,
    },
    {
        id: 'swap',
        question: 'How do I swap tokens?',
        answer: `<p>The <strong>Swap</strong> menu allows you to exchange tokens on <strong>Base chain</strong> directly, using the integrated DEX (Decentralized Exchange).</p>
<div class="${styles.stepList}">
    <div class="${styles.step}"><strong>Connect Wallet</strong><p>Make sure your wallet is connected on Base Mainnet.</p></div>
    <div class="${styles.step}"><strong>Open the Swap Menu</strong><p>Navigate to the <strong>Swap</strong> menu in the sidebar. Ensure the <strong>"Swap"</strong> tab is active.</p></div>
    <div class="${styles.step}"><strong>Select Tokens</strong><p>Choose the token you want to <strong>sell (From)</strong> and the token you want to <strong>buy (To)</strong>. Click on a token to open the list of available tokens.</p></div>
    <div class="${styles.step}"><strong>Enter Amount</strong><p>Type the amount of tokens you want to swap. The system will automatically calculate the estimated tokens you will receive based on the current price.</p></div>
    <div class="${styles.step}"><strong>Review & Confirm</strong><p>Check the swap details including <strong>slippage tolerance</strong>. Click <strong>"Swap"</strong> and confirm the transaction in your wallet.</p></div>
</div>
<div class="${styles.tipBox}"><strong>Tips:</strong> You can adjust the slippage tolerance via the settings icon on the Swap page. Default is 0.5%. For low-volume tokens, you may need to increase the slippage.</div>`,
    },
    {
        id: 'add-lp',
        question: 'How do I add liquidity for a new token?',
        answer: `<p>You can add a <strong>liquidity pool (LP)</strong> for a new token pair in the <strong>Pool</strong> tab on the Swap page.</p>
<div class="${styles.stepList}">
    <div class="${styles.step}"><strong>Connect Wallet</strong><p>Make sure your wallet is connected on Base Mainnet.</p></div>
    <div class="${styles.step}"><strong>Open the Pool Tab</strong><p>Navigate to the <strong>Swap</strong> menu, then click the <strong>"Pool"</strong> tab.</p></div>
    <div class="${styles.step}"><strong>Select Token Pair</strong><p>Choose two tokens you want to pair as liquidity. For example: <strong>NDESO / ETH</strong> or other tokens.</p></div>
    <div class="${styles.step}"><strong>Enter Amounts</strong><p>Enter the token amounts for both sides. The amounts must be <strong>balanced according to the current price ratio</strong>. If this is the first LP, you set the initial price.</p></div>
    <div class="${styles.step}"><strong>Approve & Add Liquidity</strong><p>Approve both tokens, then click <strong>"Add Liquidity"</strong>. After success, you will receive <strong>LP Tokens</strong> representing your share in the pool.</p></div>
</div>
<div class="${styles.warnBox}"><strong>Warning:</strong> Adding liquidity carries the risk of <strong>impermanent loss</strong>. Make sure you understand this concept before providing liquidity. LP Tokens can be used to remove liquidity at any time.</div>
<div class="${styles.tipBox}"><strong>Tips:</strong> To list a new token that isn't in the list yet, you can use the <strong>listing</strong> feature which requires a listing fee in NDESO.</div>`,
    },
    {
        id: 'staking',
        question: 'How do I stake NDESO tokens?',
        answer: `<p>Staking allows you to lock your <strong>NDESO</strong> tokens to earn <strong>rewards</strong> with a fixed APY percentage.</p>
<div class="${styles.stepList}">
    <div class="${styles.step}"><strong>Connect Wallet</strong><p>Make sure your wallet is connected on Base Mainnet and has NDESO balance.</p></div>
    <div class="${styles.step}"><strong>Open the Staking Menu</strong><p>Navigate to the <strong>Staking</strong> menu in the sidebar. Here you can see APY information, Total Staked, Reward Pool, and other statistics.</p></div>
    <div class="${styles.step}"><strong>Click "Stake NDESO"</strong><p>Click the <strong>"Stake"</strong> button to open the staking modal.</p></div>
    <div class="${styles.step}"><strong>Enter Amount</strong><p>Type the amount of NDESO you want to stake. Make sure the amount is above the <strong>minimum stake</strong> shown. You can also use the 25%, 50%, or MAX buttons.</p></div>
    <div class="${styles.step}"><strong>Approve & Stake</strong><p>If this is your first time staking, you need to <strong>approve</strong> the token first. Then confirm the staking transaction in your wallet.</p></div>
    <div class="${styles.step}"><strong>Claim Rewards</strong><p>Rewards accumulate automatically. You can claim at any time using the <strong>"Claim"</strong> button that appears on the Staking page when rewards are available.</p></div>
</div>`,
    },
]

export default function FAQ() {
    const [openId, setOpenId] = useState(null)

    const toggle = (id) => {
        setOpenId(prev => prev === id ? null : id)
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className="page-title">FAQ</h1>
                <p className={styles.subtitle}>Frequently asked questions about NdeFPL</p>
            </div>

            <div className={styles.faqList}>
                {faqData.map((item) => (
                    <div
                        key={item.id}
                        className={`${styles.faqCard} ${openId === item.id ? styles.faqCardOpen : ''}`}
                    >
                        <button
                            className={styles.faqQuestion}
                            onClick={() => toggle(item.id)}
                        >
                            <span className={styles.questionText}>{item.question}</span>
                            <span className={`${styles.chevron} ${openId === item.id ? styles.chevronOpen : ''}`}>
                                <img src="/bottom.svg" alt="" className={styles.chevronIcon} />
                            </span>
                        </button>
                        <div className={`${styles.faqAnswer} ${openId === item.id ? styles.faqAnswerOpen : ''}`}>
                            <div className={styles.faqAnswerInner}>
                                <div
                                    className={styles.answerContent}
                                    dangerouslySetInnerHTML={{ __html: item.answer }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.contactCard}>
                <img src="/chat.svg" alt="" className={styles.contactIconImg} />
                <div className={styles.contactText}>
                    <strong>Still have questions?</strong>
                    <p>Reach out to us through our community or social media.</p>
                </div>
                <a href="https://t.me/ndesogerak" target="_blank" rel="noopener noreferrer" className={styles.telegramLink}>
                    <img src="/telegram.svg" alt="Telegram" className={styles.telegramIcon} />
                </a>
            </div>
        </div>
    )
}
