import { Debt, Expense, GroupDetails } from '../models/group.model';

/**
 * Splits a whole amount equally. Leftover denars go one each to the lowest
 * member ids, so the same expense always splits the same way.
 */
export function splitEqually(amount: number, memberIds: number[]): Map<number, number> {
    const ids = [...new Set(memberIds)].sort((a, b) => a - b);
    const shares = new Map<number, number>();
    if (ids.length === 0) return shares;

    const base = Math.floor(amount / ids.length);
    const leftover = amount - base * ids.length;
    ids.forEach((id, index) => shares.set(id, base + (index < leftover ? 1 : 0)));
    return shares;
}

/** What each person owes for an expense: their custom amount if it has them, an equal share otherwise. */
export function expenseShares(expense: Pick<Expense, 'amount' | 'splitBetweenIds' | 'customShares'>): Map<number, number> {
    return expense.customShares
        ? new Map(expense.customShares.map((share) => [share.memberId, share.amount]))
        : splitEqually(expense.amount, expense.splitBetweenIds);
}

/** Net position per member: positive is owed money, negative owes money. The values always sum to zero. */
export function netBalances(group: Pick<GroupDetails, 'members' | 'expenses' | 'settlements'>): Map<number, number> {
    const net = new Map<number, number>(group.members.map((member) => [member.id, 0]));
    const add = (id: number, amount: number) => net.set(id, (net.get(id) ?? 0) + amount);

    for (const expense of group.expenses) {
        add(expense.paidById, expense.amount);
        expenseShares(expense).forEach((share, id) => add(id, -share));
    }
    for (const settlement of group.settlements) {
        add(settlement.fromId, settlement.amount);
        add(settlement.toId, -settlement.amount);
    }
    return net;
}

/**
 * Turns net balances into a short list of payments that settles everyone:
 * the biggest debtor pays the biggest creditor until all are at zero.
 * Needs at most one payment fewer than there are people involved.
 */
export function simplifyDebts(net: Map<number, number>): Debt[] {
    const byAmountThenId = (a: { id: number; amount: number }, b: { id: number; amount: number }) =>
        b.amount - a.amount || a.id - b.id;
    const pick = (sign: 1 | -1) =>
        [...net]
            .filter(([, balance]) => balance * sign > 0)
            .map(([id, balance]) => ({ id, amount: balance * sign }))
            .sort(byAmountThenId);

    const creditors = pick(1);
    const debtors = pick(-1);
    const debts: Debt[] = [];

    while (creditors.length && debtors.length) {
        const creditor = creditors[0];
        const debtor = debtors[0];
        const amount = Math.min(creditor.amount, debtor.amount);
        debts.push({ fromId: debtor.id, toId: creditor.id, amount });

        creditor.amount -= amount;
        debtor.amount -= amount;
        if (creditor.amount === 0) creditors.shift();
        if (debtor.amount === 0) debtors.shift();
        creditors.sort(byAmountThenId);
        debtors.sort(byAmountThenId);
    }
    return debts;
}
