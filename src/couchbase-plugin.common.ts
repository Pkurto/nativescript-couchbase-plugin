export abstract class Common {
    ios: any;
    android: any;
    config: any;

    constructor(databaseName: string) {
    }

    abstract open(): Promise<any>;

    abstract createDocument(data: Object, documentId?: string);

    abstract getDocument(documentId: string);

    abstract updateDocument(documentId: string, data: any);

    abstract deleteDocument(documentId: string);

    abstract destroyDatabase();

    abstract query(query: Query): any[];

    abstract createPullReplication(remoteUrl: string);

    abstract createPushReplication(remoteUrl: string);

    abstract addDatabaseChangeListener(callback: any);

    abstract inBatch(batch: () => void);
}

export abstract class ReplicatorBase {
    replicator: any;

    constructor(replicator: any) {
        this.replicator = replicator;
    }

    abstract start();

    abstract stop();

    abstract isRunning();

    abstract setContinuous(isContinuous: boolean);

    abstract setUserNameAndPassword(username: string, password: string);

    abstract setSessionIdAndCookieName(sessionId: string, cookieName: string);

    abstract setSessionId(sessionId: string);
}

export enum QueryMeta {
    ALL = 'COUCHBASE_ALL',
    ID = 'COUCHBASE_ID'
}

export type QueryComparisonOperator =
    | 'modulo'
    | 'is'
    | 'between'
    | 'isNot'
    | 'collate'
    | 'in'
    | 'add'
    | 'isNullOrMissing'
    | 'greaterThan'
    | 'divide'
    | 'notEqualTo'
    | 'greaterThanOrEqualTo'
    | 'like'
    | 'subtract'
    | 'lessThanOrEqualTo'
    | 'lessThan'
    | 'notNullOrMissing'
    | 'regex'
    | 'equalTo'
    | 'multiply';

export enum QueryLogicalOperator {
    AND = 'and',
    OR = 'or'
}

export enum QueryArrayOperator {
    CONTAINS = 'contains'
}

export interface Query {
    select: any[];
    // join?: any[];
    where?: any[];
    groupBy?: any;
    // having?: any;
    order?: QueryOrderItem[];
    limit?: any;
    offset?: any;
    from?: string;
}

export interface QueryWhereItem {
    logical?: QueryLogicalOperator;
    property: string;
    comparison: QueryComparisonOperator;
    value: any;
}

export interface QueryOrderItem {
    property: string;
    direction: 'asc' | 'desc';
}
