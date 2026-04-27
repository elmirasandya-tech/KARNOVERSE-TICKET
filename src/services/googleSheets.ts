import { Transaction, Expense, PettyCash } from '../types';

/**
 * Service to interact with Google Apps Script Web App
 * The user needs to provide the Web App URL in the environment variables.
 */

const SCRIPT_URL = import.meta.env.VITE_GAS_WEB_APP_URL;

export const googleSheetsService = {
  async syncTransaction(transaction: Transaction) {
    if (!SCRIPT_URL) {
      console.warn('Google Apps Script URL not configured. Transaction saved locally only.');
      return;
    }

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // GAS often requires no-cors for simple POST
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addTransaction',
          data: transaction,
        }),
      });
      return response;
    } catch (error) {
      console.error('Error syncing transaction:', error);
      throw error;
    }
  },

  async syncPettyCash(pettyCash: PettyCash) {
    if (!SCRIPT_URL) return;

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updatePettyCash',
          data: pettyCash,
        }),
      });
    } catch (error) {
      console.error('Error syncing petty cash:', error);
    }
  },

  async syncExpense(expense: Expense) {
    if (!SCRIPT_URL) return;

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addExpense',
          data: expense,
        }),
      });
    } catch (error) {
      console.error('Error syncing expense:', error);
    }
  }
};
