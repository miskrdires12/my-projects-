import React from "react";

// Official Telebirr Brand SVG
export function TelebirrIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#00A0E9" />
      <path
        d="M24 10C16.268 10 10 16.268 10 24C10 31.732 16.268 38 24 38C30.468 38 35.894 33.626 37.478 27.68H31.8C30.5 30.7 27.5 33 24 33C19.03 33 15 28.97 15 24C15 19.03 19.03 15 24 15C27.5 15 30.5 17.3 31.8 20.32H37.478C35.894 14.374 30.468 10 24 10Z"
        fill="white"
      />
      <circle cx="24" cy="24" r="4.5" fill="#FFC700" />
      <path
        d="M29 24H39M39 24L35 20M39 24L35 28"
        stroke="#FFC700"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Commercial Bank of Ethiopia (CBE Birr) SVG
export function CbeBirrIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#782B8F" />
      <circle cx="24" cy="24" r="14" stroke="#FFDF00" strokeWidth="3" />
      <path
        d="M19 18H29M24 18V30M20 30H28"
        stroke="#FFDF00"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Visa / Mastercard Multi-card SVG
export function VisaCardIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" className="fill-neutral-900 dark:fill-neutral-800" />
      <circle cx="20" cy="24" r="9" fill="#EB001B" fillOpacity="0.9" />
      <circle cx="28" cy="24" r="9" fill="#F79E1B" fillOpacity="0.9" />
    </svg>
  );
}

// Crypto / USDT Web3 Wallet SVG
export function CryptoUsdtIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#26A17B" />
      <path
        d="M24 12V36M15 17H33M17 22C17 24.5 20.1 26.5 24 26.5C27.9 26.5 31 24.5 31 22C31 19.5 27.9 17.5 24 17.5C20.1 17.5 17 19.5 17 22Z"
        stroke="white"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
