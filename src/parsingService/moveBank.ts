import { DeadlineSection } from "./todoSection";

/**
 * Represents an account number; the date string
 */
export type AccountNumber = string;

/**
 * Represents a unit of transfer request.
 */
export interface MoveTransfer {
  /**
   * The account number to transfer to.
   */
  key: AccountNumber;
  /**
   * The deadline section whose items will be transferred.
   */
  value: DeadlineSection;
}

/**
 * Represents a unit of account registration.
 */
export interface MoveAccountRegistration {
  /**
   * The account number to register.
   */
  key: AccountNumber;
  /**
   * The deadline section who will be receiving the transfer.
   */
  value: DeadlineSection;
}

/**
 * A bank of "moves".
 * moved section "registers" its items to be desposited to another to a "move bank".
 * The move bank is a map of the date string, and the section requesting its items to be vacated.
 *
 * Once the section to be deposited to is found, extract all items of the registered section to the depositee.
 */
export interface MoveBank {
  /**
   * Register a transfer request.
   */
  registerTransfer(t: MoveTransfer): void;
  /**
   * Register an account to receive transfers.
   */
  registerAccount(a: MoveAccountRegistration): void;
  /**
   * Apply all transfers.
   */
  applyTransfers(): void;
}
/**
 * A bank of moves that can be used by the parser to shuffle todo list
 */
export default class MoveBankImpl implements MoveBank {
  accounts: Record<AccountNumber, DeadlineSection>;
  transferRequests: MoveTransfer[];

  constructor() {
    this.transferRequests = [];
    this.accounts = {};
  }

  registerTransfer(t: MoveTransfer): void {
    this.transferRequests.push(t);
  }

  registerAccount(a: MoveAccountRegistration): void {
    this.accounts[a.key] = a.value;
  }

  applyTransfers(): void {
    for (const t of this.transferRequests) {
      const account = this.accounts[t.key];
      if (!account) continue;
      t.value.extractItemsTo(account);
    }
  }
}
