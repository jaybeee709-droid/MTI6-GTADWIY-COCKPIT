/* INJECTED-WALLET DETECTION — READ-ONLY (v220).
 *
 * The no-sign-in wallet layer: detect the wallets the user
 * ALREADY has installed in this browser, without connecting,
 * without a request, without a signature, without any key or
 * account. Two mechanisms, both standard and keyless:
 *
 *  1. EIP-6963 — the wallet-discovery standard: the app asks
 *     the page "announce yourselves" and installed wallets
 *     reply with their name (MetaMask, Coinbase Wallet, …).
 *     Listening costs nothing and reveals nothing private.
 *  2. Legacy window.ethereum — the older injection point,
 *     read only to name the provider that is present.
 *
 * Detection is not a connection. Nothing here calls
 * eth_requestAccounts, nothing asks the user to approve
 * anything, and no address is read — the watch wallet (a
 * public address Daniel pastes) stays the only address the
 * desk ever holds. WalletConnect v2 is NOT in this module:
 * it needs a free project ID from cloud.walletconnect.com
 * (no KYC, but a registration) — Daniel's step, on the
 * Decision Board. */

export interface InjectedWallet {
  name: string;
  /** EIP-6963 registered name, e.g. 'io.metamask'. */
  rdns?: string;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
}

type AnyWindow = Window & {
  ethereum?: {
    isMetaMask?: boolean;
    isCoinbaseWallet?: boolean;
    providers?: { isMetaMask?: boolean; isCoinbaseWallet?: boolean }[];
  };
};

interface EIP6963ProviderDetail {
  info: { uuid: string; name: string; rdns?: string; icon: string };
  provider: unknown;
}

function nameFromEthereum(eth: NonNullable<AnyWindow['ethereum']>): string | null {
  if (eth.isCoinbaseWallet) return 'Coinbase Wallet';
  if (eth.isMetaMask) return 'MetaMask';
  return null;
}

/** Detect installed injected wallets. Resolves after the
 * announce window closes (default 800ms); [] when none are
 * installed or when there is no browser window at all. */
export function detectInjectedWallets(timeoutMs = 800): Promise<InjectedWallet[]> {
  if (typeof window === 'undefined') return Promise.resolve([]);
  const found = new Map<string, InjectedWallet>();
  const win = window as AnyWindow;

  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
    if (!detail?.info?.name) return;
    const key = detail.info.rdns ?? detail.info.uuid ?? detail.info.name;
    if (!found.has(key)) {
      found.set(key, { name: detail.info.name, rdns: detail.info.rdns });
    }
  };

  window.addEventListener('eip6963:announceProvider', onAnnounce as EventListener);
  try {
    window.dispatchEvent(new CustomEvent('eip6963:requestProvider'));
  } catch {
    /* a page that blocks custom events simply yields no EIP-6963 answers */
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce as EventListener);
      /* Legacy fallback: a lone window.ethereum with no
       * EIP-6963 announcement is still a wallet, named by
       * its flags. Multiple providers surface as an array. */
      if (found.size === 0 && win.ethereum) {
        const eth = win.ethereum;
        const direct = nameFromEthereum(eth);
        if (direct) {
          found.set(direct, {
            name: direct,
            isMetaMask: eth.isMetaMask,
            isCoinbaseWallet: eth.isCoinbaseWallet,
          });
        } else if (Array.isArray(eth.providers)) {
          for (const p of eth.providers) {
            const n = nameFromEthereum(p as NonNullable<AnyWindow['ethereum']>);
            if (n && !found.has(n)) found.set(n, { name: n });
          }
        } else {
          found.set('injected', { name: 'Injected wallet' });
        }
      }
      resolve([...found.values()]);
    }, timeoutMs);
  });
}
