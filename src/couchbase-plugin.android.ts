import {
    Common,
    Query,
    QueryComparisonOperator,
    QueryLogicalOperator,
    QueryMeta,
    ReplicatorBase
} from './couchbase-plugin.common';
import * as utils from 'tns-core-modules/utils/utils';
import * as types from 'tns-core-modules/utils/types';

declare var com, co;

export class Couchbase extends Common {
    config: any;
    android: any;

    constructor(name: string) {
        super(name);
        this.config = new com.couchbase.lite.DatabaseConfiguration(
            utils.ad.getApplicationContext()
        );
        this.android = new com.couchbase.lite.Database(name, this.config);
    }

    createDocument(data: Object, documentId?: string) {
        try {
            let doc;
            if (documentId) {
                doc = new com.couchbase.lite.MutableDocument(documentId);
            } else {
                doc = new com.couchbase.lite.MutableDocument();
            }
            const keys = Object.keys(data);
            for (let key of keys) {
                const item = data[key];
                this.serialize(item, doc, key);
            }
            this.android.save(doc);
            return doc.getId();
        } catch (e) {
            return null;
        }
    }

    private deserialize(data: any) {
        if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean' || typeof data !== 'object') return data;

        if (types.isNullOrUndefined(data)) {
            return data;
        }

        switch (data.getClass().getName()) {
            case 'java.lang.String':
                return String(data);
            case 'java.lang.Boolean':
                return String(data) === 'true';
            case 'java.lang.Integer':
            case 'java.lang.Long':
            case 'java.lang.Double':
            case 'java.lang.Short':
                return Number(data);
            case 'com.couchbase.lite.Dictionary':
                const keys = data.getKeys();
                const length = keys.size();
                const object = {};
                for (let i = 0; i < length; i++) {
                    const key = keys.get(i);
                    const nativeItem = data.getValue(key);
                    object[key] = this.deserialize(nativeItem);
                }
                return object;
            case 'com.couchbase.lite.Array':
                const array = [];
                const size = data.count();
                for (let i = 0; i < size; i++) {
                    const nativeItem = data.getValue(i);
                    const item = this.deserialize(nativeItem);
                    array.push(item);
                }
                return array;
            default:
                return data;
        }
    }

    getDocument(documentId: string): any {
        try {
            const doc = this.android.getDocument(documentId);
            if (!doc) return null;
            const keys = doc.getKeys();
            const size = keys.size();
            let object = {};
            for (let i = 0; i < size; i++) {
                const key = keys.get(i);
                const nativeItem = doc.getValue(key);
                const newItem = {};
                newItem[key] = this.deserialize(nativeItem);
                object = Object.assign(object, newItem);
            }
            return object;
        } catch (e) {
            console.error(e.message);
            return null;
        }
    }

    private fromISO8601UTC(date: string) {
        const dateFormat = new java.text.SimpleDateFormat('yyyy-MM-dd\'T\'HH:mm:ss.SSSXXX');
        const tz = java.util.TimeZone.getTimeZone('UTC');
        dateFormat.setTimeZone(tz);
        return dateFormat.parse(date);
    }

    private toISO8601UTC(date: Date) {
        const dateFormat = new java.text.SimpleDateFormat('yyyy-MM-dd\'T\'HH:mm:ss.SSSXXX');
        const tz = java.util.TimeZone.getTimeZone('UTC');
        dateFormat.setTimeZone(tz);

        return dateFormat.format(date);
    }

    updateDocument(documentId: string, data: any) {
        try {
            const origin = this.android.getDocument(documentId) as com.couchbase.lite.Document;
            if (origin) {
                const doc = origin.toMutable();
                const keys = Object.keys(data);
                for (let key of keys) {
                    const item = data[key];
                    this.serialize(item, doc, key);
                }
                this.android.save(doc);
            }
        } catch (e) {
            console.error(e.message);
        }
    }

    private serializeObject(item, object, key) {
        switch (typeof item) {
            case 'object':
                if (item instanceof Date) {
                    object.setDate(key, this.fromISO8601UTC(item.toISOString()));
                    return;
                }

                if (Array.isArray(item)) {
                    const array = new com.couchbase.lite.MutableArray();
                    item.forEach((data) => {
                        this.serializeArray(data, array);
                    });
                    object.setArray(key, array);
                    return;
                }

                const nativeObject = new com.couchbase.lite.MutableDictionary();
                Object.keys(item).forEach((itemKey) => {
                    const obj = item[itemKey];
                    this.serializeObject(obj, nativeObject, itemKey);
                });
                object.setDictionary(key, object);
                break;
            case 'number':
                object.setInt(key, item);
                break;
            case 'boolean':
                object.setBoolean(key, item);
                break;
            default:
                object.setValue(key, item);
        }
    }

    private serializeArray(item, array: any) {
        switch (typeof item) {
            case 'object':
                if (item instanceof Date) {
                    array.addDate(this.fromISO8601UTC(item.toISOString()));
                    return;
                }

                if (Array.isArray(item)) {
                    const nativeArray = new com.couchbase.lite.MutableArray();
                    item.forEach((data) => {
                        this.serializeArray(data, nativeArray);
                    });
                    array.addArray(nativeArray);
                    return;
                }

                const object = new com.couchbase.lite.MutableDictionary();
                Object.keys(item).forEach((itemKey) => {
                    const obj = item[itemKey];
                    this.serializeObject(obj, object, itemKey);
                });
                array.addDictionary(object);
                break;
            case 'number':
                array.addInt(item);
                break;
            case 'boolean':
                array.addBoolean(item);
                break;
            default:
                array.addValue(item);
        }
    }

    private serialize(item, doc: any, key) {
        switch (typeof item) {
            case 'object':
                if (item instanceof Date) {
                    doc.setDate(key, this.fromISO8601UTC(item.toISOString()));
                    return;
                }

                if (Array.isArray(item)) {
                    const array = new com.couchbase.lite.MutableArray();
                    item.forEach((data) => {
                        this.serializeArray(data, array);
                    });
                    doc.setArray(key, array);
                    return;
                }

                const object = new com.couchbase.lite.MutableDictionary();
                Object.keys(item).forEach((itemKey) => {
                    const obj = item[itemKey];
                    this.serializeObject(obj, object, itemKey);
                });
                doc.setDictionary(key, object);
                break;
            case 'number':
                doc.setInt(key, item);
                break;
            case 'boolean':
                doc.setBoolean(key, item);
                break;
            default:
                doc.setValue(key, item);
        }
    }

    deleteDocument(documentId: string) {
        try {
            const doc = this.android.getDocument(documentId);
            return this.android.delete(doc);
        } catch (e) {
            console.error(e.message);
            return false;
        }
    }

    destroyDatabase() {
        try {
            this.android.delete();
        } catch (e) {
            console.error(e.message);
        }
    }

    query(query: Query = {select: []}) {
        const items = [];
        let select = [];
        if (!query.select || query.select.length === 0) {
            select.push(com.couchbase.lite.SelectResult.all());
        } else {
            query.select.forEach(item => {
                if (item === QueryMeta.ID) {
                    select.push(com.couchbase.lite.Meta.id);
                } else {
                    select.push(com.couchbase.lite.Expression.property(item));
                }
            });
        }
        let queryBuilder: any = com.couchbase.lite.QueryBuilder.select(select);
        if (query.from) {
            const db = new Couchbase(query.from);
            queryBuilder = queryBuilder.from(
                com.couchbase.lite.DataSource.database(db.android)
            );
        } else {
            queryBuilder = queryBuilder.from(
                com.couchbase.lite.DataSource.database(this.android)
            );
        }

        let nativeQuery;
        if (query.where) {
            for (let item of query.where) {
                if (item === QueryLogicalOperator.AND) {
                    if (!nativeQuery) break;
                } else if (item === QueryLogicalOperator.OR) {
                    if (!nativeQuery) break;
                } else {
                    if (item) {
                        switch (item.comparison as QueryComparisonOperator) {
                            case 'equalTo':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).equalTo(com.couchbase.lite.Expression.value(item.value));
                                break;
                            case 'add':
                                break;
                            case 'between':
                                break;
                            case 'collate':
                                break;
                            case 'divide':
                                break;
                            case 'greaterThan':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).greaterThan(com.couchbase.lite.Expression.value(item.value));
                                break;
                            case 'greaterThanOrEqualTo':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).greaterThanOrEqualTo(
                                    com.couchbase.lite.Expression.value(item.value)
                                );
                                break;
                            case 'in':
                                const inArray = [];
                                if (Array.isArray(item.value)) {
                                    for (let exp of item.value) {
                                        inArray.push(com.couchbase.lite.Expression.value(exp));
                                    }
                                } else {
                                    inArray.push(com.couchbase.lite.Expression.value(item.value));
                                }
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).in(inArray);
                                break;
                            case 'is':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).is(com.couchbase.lite.Expression.value(item.value));
                                break;
                            case 'isNot':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).isNot(com.couchbase.lite.Expression.value(item.value));
                                break;
                            case 'isNullOrMissing':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).isNullOrMissing();
                                break;
                            case 'lessThan':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).lessThan(com.couchbase.lite.Expression.value(item.value));
                                break;
                            case 'lessThanOrEqualTo':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).lessThanOrEqualTo(
                                    com.couchbase.lite.Expression.value(item.value)
                                );
                                break;
                            case 'like':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).like(com.couchbase.lite.Expression.value(item.value));
                                break;
                            case 'modulo':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).modulo(com.couchbase.lite.Expression.value(item.value));
                                break;
                            case 'multiply':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).multiply(com.couchbase.lite.Expression.value(item.value));
                                break;

                            case 'notEqualTo':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).notEqualTo(com.couchbase.lite.Expression.value(item.value));
                                break;

                            case 'notNullOrMissing':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).notNullOrMissing();
                                break;
                            case 'regex':
                                nativeQuery = com.couchbase.lite.Expression.property(
                                    item.property
                                ).regex(com.couchbase.lite.Expression.value(item.value));
                                break;
                        }
                    }
                }
            }
            if (nativeQuery) {
                queryBuilder = queryBuilder.where(nativeQuery);
            }
        }
        if (query.groupBy) {
            const groupBy = [];
            for (let prop of query.groupBy) {
                groupBy.push(com.couchbase.lite.Expression.property(prop));
            }
            if (groupBy.length > 0) {
                queryBuilder = queryBuilder.groupBy(groupBy);
            }
        }
        if (query.order) {
            const orderBy = [];
            for (let item of query.order) {
                switch (item.direction) {
                    case 'desc':
                        orderBy.push(
                            com.couchbase.lite.Ordering.property(item.property).descending()
                        );
                        break;
                    default:
                        orderBy.push(
                            com.couchbase.lite.Ordering.property(item.property).ascending()
                        );
                        break;
                }
            }
            if (orderBy.length > 0) {
                queryBuilder = queryBuilder.orderBy(orderBy);
            }
        }

        if (query.limit && typeof query.limit === 'number') {
            queryBuilder = queryBuilder.limit(
                com.couchbase.lite.Expression.value(query.limit)
            );
        }

        const result = queryBuilder.execute().allResults();
        const size = result.size();
        for (let i = 0; i < size; i++) {
            const item = result.get(i);
            const keys = item.getKeys();
            const keysSize = keys.size();
            const obj = {};
            for (let keyId = 0; keyId < keysSize; keyId++) {
                const key = keys.get(keyId);
                const nativeItem = item.getValue(key);
                if (
                    nativeItem.getClass().getName() === 'com.couchbase.lite.Dictionary'
                ) {
                    const cblKeys = nativeItem.getKeys();
                    const cblKeysSize = cblKeys.size();
                    for (let cblKeysId = 0; cblKeysId < cblKeysSize; cblKeysId++) {
                        const cblKey = cblKeys.get(cblKeysId);
                        obj[cblKey] = this.deserialize(nativeItem.getValue(cblKey));
                    }
                }
            }
            items.push(obj);
        }

        return items;
    }

    createPullReplication(
        remoteUrl: string,
        username?: string,
        password?: string
    ) {
        const uri = new com.couchbase.lite.URLEndpoint(new java.net.URI(remoteUrl));
        const repConfig = new com.couchbase.lite.ReplicatorConfiguration(
            this.android,
            uri
        );
        repConfig.setReplicatorType(
            com.couchbase.lite.ReplicatorConfiguration.ReplicatorType.PULL
        );
        if (username && password) {
            repConfig.setAuthenticator(
                new com.couchbase.lite.BasicAuthenticator(username, password)
            );
        }
        const replicator = new com.couchbase.lite.Replicator(repConfig);
        /* replicator.addChangeListener(
          new com.couchbase.lite.ReplicatorChangeListener({
            changed(param0: com.couchbase.lite.ReplicatorChange): void {}
          })
        );*/
        return new Replicator(replicator);
    }

    createPushReplication(
        remoteUrl: string,
        username?: string,
        password?: string
    ) {
        const uri = new com.couchbase.lite.URLEndpoint(new java.net.URI(remoteUrl));
        const repConfig = new com.couchbase.lite.ReplicatorConfiguration(
            this.android,
            uri
        );
        repConfig.setReplicatorType(
            com.couchbase.lite.ReplicatorConfiguration.ReplicatorType.PUSH
        );
        if (username && password) {
            repConfig.setAuthenticator(
                new com.couchbase.lite.BasicAuthenticator(username, password)
            );
        }
        const replicator = new com.couchbase.lite.Replicator(repConfig);
        /* replicator.addChangeListener(
          new com.couchbase.lite.ReplicatorChangeListener({
            changed(param0: com.couchbase.lite.ReplicatorChange): void {}
          })
        );*/
        return new Replicator(replicator);
    }

    addDatabaseChangeListener(callback: any) {
        const listener = co.fitcom.fancycouchbase.TNSDatabaseChangeListener.extend({
            onChange(changes: any): void {
                if (callback && typeof callback === 'function') {
                    const ids = [];
                    const documentIds = changes.getDocumentIDs();
                    const size = documentIds.size();
                    for (let i = 0; i < size; i++) {
                        const item = documentIds.get(i);
                        ids.push(item);
                    }
                    callback(ids);
                }
            }
        });
        this.android.addChangeListener(
            new listener()
        );
    }
}

export class Replicator extends ReplicatorBase {
    constructor(replicator: any) {
        super(replicator);
    }

    start() {
        this.replicator.start();
    }

    stop() {
        this.replicator.stop();
    }

    isRunning() {
        return (
            this.replicator.getStatus().getActivityLevel() ===
            com.couchbase.lite.AbstractReplicator.ActivityLevel.BUSY
        );
    }

    setContinuous(isContinuous: boolean) {
        this.replicator.getConfig().setContinuous(isContinuous);
    }
}