/** A group as shown in a list: just enough for a card. */
export interface Group{
    id: number;
    name: string;
    imageUrl?: string;
    memberCount: number;
    balance: number;
}

export interface Member{
    id: number;
    name: string;
}

/**
 * Amounts are whole denars. An expense is split equally between splitBetweenIds,
 * unless customShares gives each person their own amount (adding up to the total).
 */
export interface Expense{
    id: number;
    description: string;
    amount: number;
    date: Date;
    paidById: number;
    splitBetweenIds: number[];
    customShares?: { memberId: number; amount: number }[];
}

/** A payment from one member to another that pays down what they owe. */
export interface Settlement{
    id: number;
    fromId: number;
    toId: number;
    amount: number;
    date: Date;
}

export interface GroupDetails{
    id: number;
    name: string;
    imageUrl?: string;
    /**
     * True for the private tab between me and one friend: expenses without a group.
     * It behaves like a two-person group, but has no name of its own, takes no other members
     * and is listed under Friends.
     */
    direct?: boolean;
    /** the member who may rename or delete the group and remove others */
    ownerId: number;
    members: Member[];
    /** people who left or were removed; kept so the history can still name them */
    formerMembers: Member[];
    expenses: Expense[];
    settlements: Settlement[];
}

/** One suggested payment: fromId should pay toId this amount. */
export interface Debt{
    fromId: number;
    toId: number;
    amount: number;
}
