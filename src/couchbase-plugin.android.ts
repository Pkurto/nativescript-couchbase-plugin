import {
  BatchAction, BatchActionType,
  Common, LogDomain, LogLevel,
  Query,
  QueryComparisonOperator,
  QueryLogicalOperator,
  QueryMeta,
  ReplicatorBase
} from './couchbase-plugin.common';
import * as utils from 'tns-core-modules/utils/utils';
import * as types from 'tns-core-modules/utils/types';

export {
  Query,
  QueryMeta,
  QueryArrayOperator,
  QueryComparisonOperator,
  QueryLogicalOperator,
  QueryOrderItem,
  QueryWhereItem
} from './couchbase-plugin.common';

declare var com, co;

let requestIdCounter = 0;
const pendingRequests = {};
const persistentRequests = {};

let completeCallback: org.nativescript.couchbaseplugin.Threaded.CompleteCallback;

function ensureCompleteCallback() {
  if (typeof (completeCallback) !== 'undefined') {
    return;
  }

  completeCallback = new org.nativescript.couchbaseplugin.Threaded.CompleteCallback({
    onComplete: function (result: any, context: any) {
      // as a context we will receive the id of the request
      onRequestComplete(context, result);
    },
    onError: function (error: string, context: any) {
      onRequestError(error, context);
    },
  });
}

function onRequestComplete(requestId: number, result: any) {
  const callbacks = pendingRequests[requestId];
  delete pendingRequests[requestId];
  if (callbacks) {
    callbacks.resolveCallback(result);
  } else {
    const persistentCallbacks = persistentRequests[requestId];
    if (persistentCallbacks) {
      persistentCallbacks.resolveCallback(result);
    }
  }
}

function onRequestError(error: string, requestId: number) {
  const callbacks = pendingRequests[requestId];
  delete pendingRequests[requestId];
  if (callbacks) {
    callbacks.rejectCallback(new Error(error));
  }
}

export class Couchbase extends Common {
  config: any;
  android: org.nativescript.couchbaseplugin.ThreadedDatabase;
  name: string;

  public static setLogLevel(domain: LogDomain, level: LogLevel) {
    let javaDomain = com.couchbase.lite.LogDomain.ALL;
    let javaLevel = com.couchbase.lite.LogLevel.DEBUG;

    if (domain === LogDomain.DATABASE) {
      javaDomain = com.couchbase.lite.LogDomain.DATABASE;
    } else if (domain === LogDomain.QUERY) {
      javaDomain = com.couchbase.lite.LogDomain.QUERY;
    } else if (domain === LogDomain.REPLICATOR) {
      javaDomain = com.couchbase.lite.LogDomain.REPLICATOR;
    } else if (domain === LogDomain.NETWORK) {
      javaDomain = com.couchbase.lite.LogDomain.NETWORK;
    }

    if (level === LogLevel.VERBOSE) {
      javaLevel = com.couchbase.lite.LogLevel.VERBOSE;
    } else if (level === LogLevel.INFO) {
      javaLevel = com.couchbase.lite.LogLevel.INFO;
    } else if (level === LogLevel.WARNING) {
      javaLevel = com.couchbase.lite.LogLevel.WARNING;
    } else if (level === LogLevel.ERROR) {
      javaLevel = com.couchbase.lite.LogLevel.ERROR;
    } else if (level === LogLevel.NONE) {
      javaLevel = com.couchbase.lite.LogLevel.NONE;
    }

    com.couchbase.lite.Database.setLogLevel(javaDomain, javaLevel);
  }

  constructor(name: string) {
    super(name);
    this.name = name;
    this.config = new com.couchbase.lite.DatabaseConfiguration(
      utils.ad.getApplicationContext()
    );
  }

  open(): Promise<any> {
    return new Promise((resolve, reject) => {
      pendingRequests[requestIdCounter] = {
        resolveCallback: (db) => {
          this.android = db;
          resolve();
        },
        rejectCallback: reject
      };

      ensureCompleteCallback();
      org.nativescript.couchbaseplugin.ThreadedDatabase.Open(this.name, this.config, completeCallback, new java.lang.Integer(requestIdCounter));

      // increment the id counter
      requestIdCounter++;
    });
  }

  inBatch(batchActions: BatchAction[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }

      const javaList = new java.util.ArrayList();
      batchActions.forEach(batchAction => {
        if (batchAction === null) {
          return;
        }
        const javaBatchAction = new org.nativescript.couchbaseplugin.BatchAction();
        if (batchAction.type === BatchActionType.CREATE) {
          javaBatchAction.setMutableDocument(batchAction.android);
          javaBatchAction.setType(org.nativescript.couchbaseplugin.BatchAction.BatchActionType.CREATE);
        } else if (batchAction.type === BatchActionType.UPDATE) {
          javaBatchAction.setMutableDocument(batchAction.android);
          javaBatchAction.setType(org.nativescript.couchbaseplugin.BatchAction.BatchActionType.UPDATE);
        } else if (batchAction.type === BatchActionType.DELETE) {
          javaBatchAction.setDocument(batchAction.android);
          javaBatchAction.setType(org.nativescript.couchbaseplugin.BatchAction.BatchActionType.DELETE);
        }
        javaList.add(javaBatchAction);
      });

      pendingRequests[requestIdCounter] = {
        resolveCallback: resolve,
        rejectCallback: reject
      };

      ensureCompleteCallback();
      this.android.inBatch(javaList, completeCallback, new java.lang.Integer(requestIdCounter));

      // increment the id counter
      requestIdCounter++;
    });
  }

  createDocument(data: Object, documentId?: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }

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
        pendingRequests[requestIdCounter] = {
          resolveCallback: () => {
            resolve(doc.getId());
          },
          rejectCallback: reject
        };

        ensureCompleteCallback();
        this.android.save(doc, completeCallback, new java.lang.Integer(requestIdCounter));

        // increment the id counter
        requestIdCounter++;
      } catch (e) {
        reject(e);
      }
    });
  }

  createDocumentBatchAction(data: Object, documentId?: string): Promise<BatchAction> {
    return new Promise<BatchAction>((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }

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

        const action = new BatchAction();
        action.type = BatchActionType.CREATE;
        action.android = doc;
        resolve(action);
      } catch (e) {
        reject(e);
      }
    });
  }

  private deserialize(data: any) {
    if (
      typeof data === 'string' ||
      typeof data === 'number' ||
      typeof data === 'boolean' ||
      typeof data !== 'object'
    )
      return data;

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
      case 'java.lang.Float':
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

  getDocument(documentId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }

      pendingRequests[requestIdCounter] = {
        resolveCallback: ((doc) => {
          if (!doc) return resolve(null);
          const keys = doc.getKeys();
          const size = keys.size();
          let object = {};
          object['id'] = doc.getId();
          for (let i = 0; i < size; i++) {
            const key = keys.get(i);
            const nativeItem = doc.getValue(key);
            const newItem = {};
            newItem[key] = this.deserialize(nativeItem);
            object = Object.assign(object, newItem);
          }
          return resolve(object);
        }),
        rejectCallback: reject
      };

      ensureCompleteCallback();
      this.android.getDocument(documentId, completeCallback, new java.lang.Integer(requestIdCounter));

      // increment the id counter
      requestIdCounter++;
    });
  }

  private fromISO8601UTC(date: string) {
    const dateFormat = new java.text.SimpleDateFormat(
      'yyyy-MM-dd\'T\'HH:mm:ss.SSSXXX'
    );
    const tz = java.util.TimeZone.getTimeZone('UTC');
    dateFormat.setTimeZone(tz);
    return dateFormat.parse(date);
  }

  private toISO8601UTC(date: Date) {
    const dateFormat = new java.text.SimpleDateFormat(
      'yyyy-MM-dd\'T\'HH:mm:ss.SSSXXX'
    );
    const tz = java.util.TimeZone.getTimeZone('UTC');
    dateFormat.setTimeZone(tz);

    return dateFormat.format(date);
  }

  updateDocument(documentId: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }

      pendingRequests[requestIdCounter] = {
        resolveCallback: ((origin) => {
          if (origin) {
            const doc = origin.toMutable();
            const keys = Object.keys(data);
            for (let key of keys) {
              const item = data[key];
              this.serialize(item, doc, key);
            }

            pendingRequests[requestIdCounter] = {
              resolveCallback: resolve,
              rejectCallback: reject
            };

            ensureCompleteCallback();
            this.android.save(doc, completeCallback, new java.lang.Integer(requestIdCounter));

            // increment the id counter
            requestIdCounter++;
          } else {
            resolve();
          }
        }),
        rejectCallback: (e) => {
          reject(e);
        }
      };

      ensureCompleteCallback();
      this.android.getDocument(documentId, completeCallback, new java.lang.Integer(requestIdCounter));

      // increment the id counter
      requestIdCounter++;
    });
  }

  updateDocumentBatchAction(documentId: string, data: any): Promise<BatchAction> {
    return new Promise<BatchAction>((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }

      pendingRequests[requestIdCounter] = {
        resolveCallback: ((origin) => {
          if (origin) {
            const doc = origin.toMutable();
            const keys = Object.keys(data);
            for (let key of keys) {
              const item = data[key];
              this.serialize(item, doc, key);
            }

            const action = new BatchAction();
            action.type = BatchActionType.UPDATE;
            action.android = doc;
            resolve(action);
          } else {
            resolve(null);
          }
        }),
        rejectCallback: (e) => {
          reject(e);
        }
      };

      ensureCompleteCallback();
      this.android.getDocument(documentId, completeCallback, new java.lang.Integer(requestIdCounter));

      // increment the id counter
      requestIdCounter++;
    });
  }

  upsertDocument(documentId: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }

      pendingRequests[requestIdCounter] = {
        resolveCallback: ((origin) => {
          let doc;
          if (origin) {
            doc = origin.toMutable();
          } else {
            doc = new com.couchbase.lite.MutableDocument(documentId);
          }

          const keys = Object.keys(data);
          for (let key of keys) {
            const item = data[key];
            this.serialize(item, doc, key);
          }

          pendingRequests[requestIdCounter] = {
            resolveCallback: resolve,
            rejectCallback: reject
          };

          ensureCompleteCallback();
          this.android.save(doc, completeCallback, new java.lang.Integer(requestIdCounter));

          // increment the id counter
          requestIdCounter++;
        }),
        rejectCallback: (e) => {
          reject(e);
        }
      };

      ensureCompleteCallback();
      this.android.getDocument(documentId, completeCallback, new java.lang.Integer(requestIdCounter));

      // increment the id counter
      requestIdCounter++;
    });
  }

  upsertDocumentBatchAction(documentId: string, data: any): Promise<BatchAction> {
    return new Promise<BatchAction>((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }

      pendingRequests[requestIdCounter] = {
        resolveCallback: ((origin) => {
          if (origin) {
            const doc = origin.toMutable();
            const keys = Object.keys(data);
            for (let key of keys) {
              const item = data[key];
              this.serialize(item, doc, key);
            }

            const action = new BatchAction();
            action.type = BatchActionType.UPDATE;
            action.android = doc;
            resolve(action);
          } else {
            const doc = new com.couchbase.lite.MutableDocument(documentId);
            const keys = Object.keys(data);
            for (let key of keys) {
              const item = data[key];
              this.serialize(item, doc, key);
            }

            const action = new BatchAction();
            action.type = BatchActionType.CREATE;
            action.android = doc;
            resolve(action);
          }
        }),
        rejectCallback: (e) => {
          reject(e);
        }
      };

      ensureCompleteCallback();
      this.android.getDocument(documentId, completeCallback, new java.lang.Integer(requestIdCounter));

      // increment the id counter
      requestIdCounter++;
    });
  }

  private serializeObject(item, object, key) {
    if (item === null) {
      return;
    }

    switch (typeof item) {
      case 'object':
        if (item instanceof Date) {
          object.setDate(key, this.fromISO8601UTC(item.toISOString()));
          return;
        }

        if (Array.isArray(item)) {
          const array = new com.couchbase.lite.MutableArray();
          item.forEach(data => {
            this.serializeArray(data, array);
          });
          object.setArray(key, array);
          return;
        }

        const nativeObject = new com.couchbase.lite.MutableDictionary();
        Object.keys(item).forEach(itemKey => {
          const obj = item[itemKey];
          this.serializeObject(obj, nativeObject, itemKey);
        });
        object.setDictionary(key, nativeObject);
        break;
      case 'number':
        if (this.numberIs64Bit(item)) {
          if (this.numberHasDecimals(item)) {
            object.setDouble(key, item);
          } else {
            object.setLong(key, item);
          }
        } else {
          if (this.numberHasDecimals(item)) {
            object.setFloat(key, item);
          } else {
            object.setInt(key, item);
          }
        }
        break;
      case 'boolean':
        object.setBoolean(key, item);
        break;
      default:
        object.setValue(key, item);
    }
  }

  private serializeArray(item, array: any) {
    if (item === null) {
      return;
    }

    switch (typeof item) {
      case 'object':
        if (item instanceof Date) {
          array.addDate(this.fromISO8601UTC(item.toISOString()));
          return;
        }

        if (Array.isArray(item)) {
          const nativeArray = new com.couchbase.lite.MutableArray();
          item.forEach(data => {
            this.serializeArray(data, nativeArray);
          });
          array.addArray(nativeArray);
          return;
        }

        const object = new com.couchbase.lite.MutableDictionary();
        Object.keys(item).forEach(itemKey => {
          const obj = item[itemKey];
          this.serializeObject(obj, object, itemKey);
        });
        array.addDictionary(object);
        break;
      case 'number':
        if (this.numberIs64Bit(item)) {
          if (this.numberHasDecimals(item)) {
            array.addDouble(item);
          } else {
            array.addLong(item);
          }
        } else {
          if (this.numberHasDecimals(item)) {
            array.addFloat(item);
          } else {
            array.addInt(item);
          }
        }
        break;
      case 'boolean':
        array.addBoolean(item);
        break;
      default:
        array.addValue(item);
    }
  }

  private serialize(item, doc: any, key) {
    if (item === null) {
      return;
    }

    switch (typeof item) {
      case 'object':
        if (item instanceof Date) {
          doc.setDate(key, this.fromISO8601UTC(item.toISOString()));
          return;
        }

        if (Array.isArray(item)) {
          const array = new com.couchbase.lite.MutableArray();
          item.forEach(data => {
            this.serializeArray(data, array);
          });
          doc.setArray(key, array);
          return;
        }

        const object = new com.couchbase.lite.MutableDictionary();
        Object.keys(item).forEach(itemKey => {
          const obj = item[itemKey];
          this.serializeObject(obj, object, itemKey);
        });
        doc.setDictionary(key, object);
        break;
      case 'number':
        if (this.numberIs64Bit(item)) {
          if (this.numberHasDecimals(item)) {
            doc.setDouble(key, item);
          } else {
            doc.setLong(key, item);
          }
        } else {
          if (this.numberHasDecimals(item)) {
            doc.setFloat(key, item);
          } else {
            doc.setInt(key, item);
          }
        }
        break;
      case 'boolean':
        doc.setBoolean(key, item);
        break;
      default:
        doc.setValue(key, item);
    }
  }

  numberHasDecimals(item: number) {
    return !(item % 1 === 0);
  }

  numberIs64Bit(item: number) {
    return item < -Math.pow(2, 31) + 1 || item > Math.pow(2, 31) - 1;
  }

  deleteDocument(documentId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }

      pendingRequests[requestIdCounter] = {
        resolveCallback: ((doc) => {
          if (doc) {
            pendingRequests[requestIdCounter] = {
              resolveCallback: resolve,
              rejectCallback: reject
            };

            ensureCompleteCallback();
            this.android.delete(doc, completeCallback, new java.lang.Integer(requestIdCounter));

            // increment the id counter
            requestIdCounter++;
          } else {
            resolve();
          }
        }),
        rejectCallback: reject
      };

      ensureCompleteCallback();
      this.android.getDocument(documentId, completeCallback, new java.lang.Integer(requestIdCounter));

      // increment the id counter
      requestIdCounter++;
    });
  }

  deleteDocumentBatchAction(documentId: string): Promise<BatchAction> {
    return new Promise<BatchAction>((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }

      pendingRequests[requestIdCounter] = {
        resolveCallback: ((doc) => {
          if (doc) {
            const action = new BatchAction();
            action.type = BatchActionType.DELETE;
            action.android = doc;
            resolve(action);
          } else {
            resolve(null);
          }
        }),
        rejectCallback: reject
      };

      ensureCompleteCallback();
      this.android.getDocument(documentId, completeCallback, new java.lang.Integer(requestIdCounter));

      // increment the id counter
      requestIdCounter++;
    });
  }

  destroyDatabase() {
    return new Promise((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }

      pendingRequests[requestIdCounter] = {
        resolveCallback: resolve,
        rejectCallback: reject
      };

      ensureCompleteCallback();
      this.android.delete(completeCallback, new java.lang.Integer(requestIdCounter));

      // increment the id counter
      requestIdCounter++;
    });
  }

  private setComparision(item) {
    let nativeQuery;
    switch (item.comparison as QueryComparisonOperator) {
      case 'equalTo':
        nativeQuery = com.couchbase.lite.Expression.property(
          item.property
        ).equalTo(com.couchbase.lite.Expression.value(item.value));
        break;
      case 'add':
        nativeQuery = com.couchbase.lite.Expression.property(item.property).add(
          com.couchbase.lite.Expression.value(item.value)
        );
        break;
      case 'between':
        if (Array.isArray(item.value) && item.value.length === 2) {
          nativeQuery = com.couchbase.lite.Expression.property(
            item.property
          ).between(
            com.couchbase.lite.Expression.value(item.value[0]),
            com.couchbase.lite.Expression.value(item.value[1])
          );
        }
        break;
      case 'collate':
        nativeQuery = com.couchbase.lite.Expression.property(
          item.property
        ).collate(com.couchbase.lite.Expression.value(item.value));
        break;
      case 'divide':
        nativeQuery = com.couchbase.lite.Expression.property(
          item.property
        ).divide(com.couchbase.lite.Expression.value(item.value));
        break;
      case 'greaterThan':
        nativeQuery = com.couchbase.lite.Expression.property(
          item.property
        ).greaterThan(com.couchbase.lite.Expression.value(item.value));
        break;
      case 'greaterThanOrEqualTo':
        nativeQuery = com.couchbase.lite.Expression.property(
          item.property
        ).greaterThanOrEqualTo(com.couchbase.lite.Expression.value(item.value));
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
        nativeQuery = com.couchbase.lite.Expression.property(item.property).in(
          inArray
        );
        break;
      case 'is':
        nativeQuery = com.couchbase.lite.Expression.property(item.property).is(
          com.couchbase.lite.Expression.value(item.value)
        );
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
        ).lessThanOrEqualTo(com.couchbase.lite.Expression.value(item.value));
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
    return nativeQuery;
  }

  query(query: Query = {select: [QueryMeta.ALL, QueryMeta.ID]}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }

      let select = [];
      if (!query.select || query.select.length === 0) {
        select.push(com.couchbase.lite.SelectResult.all());
        select.push(
          com.couchbase.lite.SelectResult.expression(com.couchbase.lite.Meta.id)
        );
      } else {
        query.select.forEach(item => {
          if (item === QueryMeta.ID) {
            select.push(
              com.couchbase.lite.SelectResult.expression(
                com.couchbase.lite.Meta.id
              )
            );
          } else if (item === QueryMeta.ALL) {
            select.push(com.couchbase.lite.SelectResult.all());
          } else {
            select.push(com.couchbase.lite.SelectResult.property(item));
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
          com.couchbase.lite.DataSource.database(this.android.db)
        );
      }

      let nativeQuery = null;
      if (query.where) {
        for (let item of query.where) {
          if (item.logical === QueryLogicalOperator.AND) {
            if (!nativeQuery) break;
            nativeQuery = nativeQuery.and(this.setComparision(item));
          } else if (item.logical === QueryLogicalOperator.OR) {
            if (!nativeQuery) break;
            nativeQuery = nativeQuery.or(this.setComparision(item));
          } else {
            nativeQuery = this.setComparision(item);
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
        if (query.offset && typeof query.offset === 'number') {
          queryBuilder = queryBuilder.limit(
            com.couchbase.lite.Expression.intValue(query.limit),
            com.couchbase.lite.Expression.intValue(query.offset)
          );
        } else {
          queryBuilder = queryBuilder.limit(
            com.couchbase.lite.Expression.intValue(query.limit)
          );
        }
      }

      pendingRequests[requestIdCounter] = {
        resolveCallback: (result) => {
          const items = [];
          const size = result.size();
          for (let i = 0; i < size; i++) {
            const item = result.get(i);
            const keys = item.getKeys();
            const keysSize = keys.size();
            const obj = {};
            for (let keyId = 0; keyId < keysSize; keyId++) {
              const key = keys.get(keyId);
              const nativeItem = item.getValue(key);
              if (typeof nativeItem === 'string') {
                obj[key] = nativeItem;
              } else if (
                nativeItem &&
                nativeItem.getClass() &&
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

          resolve(items);
        },
        rejectCallback: reject
      };

      ensureCompleteCallback();
      this.android.executeQuery(queryBuilder, completeCallback, new java.lang.Integer(requestIdCounter));

      // increment the id counter
      requestIdCounter++;
    });
  }

  createPullReplication(
    remoteUrl: string
  ) {
    const uri = new com.couchbase.lite.URLEndpoint(new java.net.URI(remoteUrl));
    const repConfig = new com.couchbase.lite.ReplicatorConfiguration(
      this.android,
      uri
    );
    repConfig.setReplicatorType(
      com.couchbase.lite.ReplicatorConfiguration.ReplicatorType.PULL
    );
    const replicator = new com.couchbase.lite.Replicator(repConfig);

    return new Replicator(replicator);
  }

  createPushReplication(
    remoteUrl: string
  ) {
    const uri = new com.couchbase.lite.URLEndpoint(new java.net.URI(remoteUrl));
    const repConfig = new com.couchbase.lite.ReplicatorConfiguration(
      this.android,
      uri
    );
    repConfig.setReplicatorType(
      com.couchbase.lite.ReplicatorConfiguration.ReplicatorType.PUSH
    );
    const replicator = new com.couchbase.lite.Replicator(repConfig);
    return new Replicator(replicator);
  }

  addDatabaseChangeListener(callback: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.android) {
        return reject('DB ' + this.name + ' is not loaded');
      }
      
      pendingRequests[requestIdCounter] = {
        resolveCallback: resolve,
        rejectCallback: reject
      };

      persistentRequests[requestIdCounter + 1] = {
        resolveCallback: (changes) => {
          const ids = [];
          const documentIds = changes.getDocumentIDs();
          const size = documentIds.size();
          for (let i = 0; i < size; i++) {
            const item = documentIds.get(i);
            ids.push(item);
          }
          callback(ids);
        },
      };

      ensureCompleteCallback();
      this.android.addChangeListener(completeCallback, new java.lang.Integer(requestIdCounter), new java.lang.Integer(requestIdCounter + 1));

      // increment the id counter twice.
      requestIdCounter++;
      requestIdCounter++;
    });
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
    const newConfig = new com.couchbase.lite.ReplicatorConfiguration(this.replicator.getConfig());
    newConfig.setContinuous(isContinuous);
    this.replicator = new com.couchbase.lite.Replicator(newConfig);
  }

  setSessionId(sessionId: string) {
    const newConfig = new com.couchbase.lite.ReplicatorConfiguration(this.replicator.getConfig());
    newConfig.setAuthenticator(
      new com.couchbase.lite.SessionAuthenticator(sessionId)
    );
    this.replicator = new com.couchbase.lite.Replicator(newConfig);
  }

  setSessionIdAndCookieName(sessionId: string, cookieName: string) {
    const newConfig = new com.couchbase.lite.ReplicatorConfiguration(this.replicator.getConfig());
    newConfig.setAuthenticator(
      new com.couchbase.lite.SessionAuthenticator(sessionId, cookieName)
    );
    this.replicator = new com.couchbase.lite.Replicator(newConfig);
  }

  setUserNameAndPassword(username: string, password: string) {
    const newConfig = new com.couchbase.lite.ReplicatorConfiguration(this.replicator.getConfig());
    newConfig.setAuthenticator(
      new com.couchbase.lite.BasicAuthenticator(username, password)
    );
    this.replicator = new com.couchbase.lite.Replicator(newConfig);
  }
}
