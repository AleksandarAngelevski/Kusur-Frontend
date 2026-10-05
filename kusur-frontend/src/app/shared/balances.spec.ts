import { Expense, Member, Settlement } from '../models/group.model';
import { expenseShares, netBalances, simplifyDebts, splitEqually } from './balances';

const members = (...ids: number[]): Member[] => ids.map((id) => ({ id, name: `M${id}` }));
const expense = (amount: number, paidById: number, splitBetweenIds: number[]): Expense =>
    ({ id: 0, description: 'x', amount, date: new Date(), paidById, splitBetweenIds });
const settlement = (fromId: number, toId: number, amount: number): Settlement =>
    ({ id: 0, fromId, toId, amount, date: new Date() });

const sum = (values: Iterable<number>) => [...values].reduce((total, value) => total + value, 0);

describe('splitEqually', () => {
    it('should give everyone the same share when it divides evenly', () => {
        expect([...splitEqually(900, [1, 2, 3])]).toEqual([[1, 300], [2, 300], [3, 300]]);
    });

    it('should hand leftover denars to the lowest ids, whatever order they come in', () => {
        expect([...splitEqually(100, [3, 1, 2])]).toEqual([[1, 34], [2, 33], [3, 33]]);
        expect([...splitEqually(101, [2, 3, 1])]).toEqual([[1, 34], [2, 34], [3, 33]]);
    });

    it('should always add back up to the amount', () => {
        for (const amount of [1, 2, 7, 100, 999, 10001]) {
            expect(sum(splitEqually(amount, [1, 2, 3, 4, 5, 6, 7]).values())).toBe(amount);
        }
    });

    it('should ignore duplicate ids and return nothing for nobody', () => {
        expect([...splitEqually(100, [1, 1, 2])]).toEqual([[1, 50], [2, 50]]);
        expect(splitEqually(100, []).size).toBe(0);
    });
});

describe('netBalances', () => {
    it('should credit the payer and charge each person their share', () => {
        const net = netBalances({ members: members(1, 2, 3, 4), expenses: [expense(1600, 1, [1, 2, 3, 4])], settlements: [] });

        expect([...net]).toEqual([[1, 1200], [2, -400], [3, -400], [4, -400]]);
    });

    it('should leave people outside an expense untouched', () => {
        const net = netBalances({ members: members(1, 2, 3), expenses: [expense(800, 2, [2, 3])], settlements: [] });

        expect([...net]).toEqual([[1, 0], [2, 400], [3, -400]]);
    });

    it('should move a settlement from the payer to the receiver', () => {
        const net = netBalances({
            members: members(1, 2),
            expenses: [expense(1000, 1, [1, 2])],
            settlements: [settlement(2, 1, 300)],
        });

        expect([...net]).toEqual([[1, 200], [2, -200]]);
    });

    it('should always sum to zero', () => {
        const net = netBalances({
            members: members(1, 2, 3),
            expenses: [expense(100, 1, [1, 2, 3]), expense(250, 3, [1, 2]), expense(7, 2, [3])],
            settlements: [settlement(2, 1, 40)],
        });

        expect(sum(net.values())).toBe(0);
    });
});

describe('simplifyDebts', () => {
    it('should return nothing when everyone is settled', () => {
        expect(simplifyDebts(new Map([[1, 0], [2, 0]]))).toEqual([]);
    });

    it('should have each debtor pay the single creditor', () => {
        expect(simplifyDebts(new Map([[1, 1200], [2, -400], [3, -400], [4, -400]]))).toEqual([
            { fromId: 2, toId: 1, amount: 400 },
            { fromId: 3, toId: 1, amount: 400 },
            { fromId: 4, toId: 1, amount: 400 },
        ]);
    });

    it('should collapse a chain of debts into one payment', () => {
        // 3 owes 2 and 2 owes 1 the same amount: 2 nets to zero and drops out
        expect(simplifyDebts(new Map([[1, 500], [2, 0], [3, -500]]))).toEqual([{ fromId: 3, toId: 1, amount: 500 }]);
    });

    it('should settle everyone in fewer payments than there are people', () => {
        const net = new Map([[1, 700], [2, 300], [3, -450], [4, -350], [5, -200]]);
        const debts = simplifyDebts(net);

        expect(debts.length).toBeLessThan(net.size);
        for (const debt of debts) {
            net.set(debt.fromId, net.get(debt.fromId)! + debt.amount);
            net.set(debt.toId, net.get(debt.toId)! - debt.amount);
        }
        expect([...net.values()]).toEqual([0, 0, 0, 0, 0]);
    });
});

describe('expenseShares', () => {
    it('should split equally when there are no custom shares', () => {
        expect([...expenseShares(expense(900, 1, [1, 2, 3]))]).toEqual([[1, 300], [2, 300], [3, 300]]);
    });

    it('should use the custom amounts when the expense has them', () => {
        const custom = { ...expense(1000, 1, [1, 2]), customShares: [{ memberId: 1, amount: 250 }, { memberId: 2, amount: 750 }] };

        expect([...expenseShares(custom)]).toEqual([[1, 250], [2, 750]]);
        expect([...netBalances({ members: members(1, 2), expenses: [custom], settlements: [] })]).toEqual([[1, 750], [2, -750]]);
    });
});
