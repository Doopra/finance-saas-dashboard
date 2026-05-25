const text = '2026-05-10 Salary 5000 credit\n2026-05-12 POS Purchase 200 debit';

const parseTextTransactions = (text) => {
  const lines = text.split('\n');
  const transactions = [];
  const dateRegex = /\b(\d{1,2})[-/\s.,](\d{1,2}|\w{3,9})[-/\s.,](\d{2,4})\b|\b(\d{4})[-/\s.,](\d{1,2}|\w{3,9})[-/\s.,](\d{1,2})\b/;

  lines.forEach(line => {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.length < 10) return;

    const dateMatch = cleanLine.match(dateRegex);
    if (!dateMatch) return;

    const dateStr = dateMatch[0];
    let remaining = cleanLine.replace(dateStr, '').trim();
    
    const numberRegex = /\b\d{1,3}(?:,\d{3})*(?:\.\d{2,})\b|\b\d+(?:\.\d{2,})\b/g;
    const numbers = remaining.match(numberRegex) || [];
    
    if (numbers.length === 0) return;
    
    let amountVal = 0;
    for (const num of numbers) {
      const val = parseFloat(num.replace(/,/g, ''));
      if (val > 0) {
        amountVal = val;
        break;
      }
    }
    
    if (amountVal === 0) return;

    let description = remaining;
    numbers.forEach(num => {
      description = description.replace(num, '');
    });
    
    description = description
      .replace(/[₦$€£\-\+\*]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (description.length < 3) {
      description = 'Transaction Info';
    }

    const lowerLine = cleanLine.toLowerCase();
    const isCredit = lowerLine.includes('cr') || 
                     lowerLine.includes('credit') || 
                     lowerLine.includes('inflow') ||
                     lowerLine.includes('deposit') ||
                     cleanLine.includes('+');

    const type = isCredit ? 'credit' : 'debit';
    
    transactions.push({
      date: dateStr,
      description,
      amount: amountVal,
      type
    });
  });

  return transactions;
};

console.log(parseTextTransactions(text));
