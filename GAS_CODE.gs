/**
 * Google Apps Script for Event Ticket Cashier
 * 
 * Instructions:
 * 1. Create a new Google Spreadsheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code.
 * 4. Create sheets named: "Transactions", "Expenses", "PettyCash".
 * 5. Deploy as Web App (Execute as: Me, Access: Anyone).
 * 6. Copy the Web App URL and put it in VITE_GAS_WEB_APP_URL in your app.
 */

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var json = JSON.parse(e.postData.contents);
  var action = json.action;
  var data = json.data;

  if (action === 'addTransaction') {
    var sheet = ss.getSheetByName("Transactions");
    if (!sheet) sheet = ss.insertSheet("Transactions");
    
    // Header if empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "Timestamp", "Items", "Total", "Method", "Cashier"]);
    }
    
    var itemsStr = data.items.map(function(item) {
      return item.quantity + "x " + item.name;
    }).join(", ");
    
    sheet.appendRow([
      data.id,
      data.timestamp,
      itemsStr,
      data.total,
      data.paymentMethod,
      data.cashier
    ]);
    
    return ContentService.createTextOutput("Success");
  }

  if (action === 'addExpense') {
    var sheet = ss.getSheetByName("Expenses");
    if (!sheet) sheet = ss.insertSheet("Expenses");
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "Timestamp", "Note", "Amount"]);
    }
    
    sheet.appendRow([
      data.id,
      data.timestamp,
      data.note,
      data.amount
    ]);
    
    return ContentService.createTextOutput("Success");
  }

  if (action === 'updatePettyCash') {
    var sheet = ss.getSheetByName("PettyCash");
    if (!sheet) sheet = ss.insertSheet("PettyCash");
    
    sheet.clear();
    sheet.appendRow(["Initial Balance", "Current Balance", "Last Updated"]);
    sheet.appendRow([data.initialBalance, data.currentBalance, new Date().toISOString()]);
    
    return ContentService.createTextOutput("Success");
  }

  return ContentService.createTextOutput("Invalid Action");
}
