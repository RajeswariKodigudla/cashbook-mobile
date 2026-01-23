// Date filtering utility for mobile app
export function filterByRange(transactions, range) {
  const now = new Date();

  if (range === "all") return transactions;

  if (range === "daily") {
    return transactions.filter(
      (t) =>
        new Date(t.date).toDateString() ===
        now.toDateString()
    );
  }

  if (range === "weekly") {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    return transactions.filter(
      (t) => new Date(t.date) >= weekAgo
    );
  }

  if (range === "monthly") {
    return transactions.filter(
      (t) =>
        new Date(t.date).getMonth() === now.getMonth() &&
        new Date(t.date).getFullYear() === now.getFullYear()
    );
  }

  if (range === "yearly") {
    return transactions.filter(
      (t) =>
        new Date(t.date).getFullYear() ===
        now.getFullYear()
    );
  }

  return transactions;
}

