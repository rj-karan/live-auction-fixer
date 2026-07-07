export function formatMoney(amount: number | null | undefined, currency = "₹") {
  if (amount == null) return `${currency}0`;
  const num = Number(amount);
  if (num >= 10000000) return `${currency}${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `${currency}${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `${currency}${(num / 1000).toFixed(1)}K`;
  return `${currency}${num.toFixed(0)}`;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
