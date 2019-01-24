package org.nativescript.couchbaseplugin;

import android.util.Log;

import com.couchbase.lite.CouchbaseLiteException;
import com.couchbase.lite.Database;
import com.couchbase.lite.DatabaseChangeListener;
import com.couchbase.lite.DatabaseConfiguration;
import com.couchbase.lite.Document;
import com.couchbase.lite.MutableDocument;
import com.couchbase.lite.Query;
import com.couchbase.lite.Result;
import com.couchbase.lite.Select;

import java.util.List;

public class ThreadedDatabase {
    static final String TAG = "ThreadedDatabase";
    public Database db;

    private ThreadedDatabase(String name, DatabaseConfiguration configuration) throws CouchbaseLiteException {
        this.db = new com.couchbase.lite.Database(name, configuration);
    }

    public static void Open(final String name, final DatabaseConfiguration configuration, final Threaded.CompleteCallback callback, final Object context) {
        final android.os.Handler mHandler = new android.os.Handler();
        Threaded.threadPoolExecutor().execute(new Runnable() {
            @Override
            public void run() {
                final ThreadedDatabase.OpenDatabaseTask task = new ThreadedDatabase.OpenDatabaseTask(callback, context);
                try {
                    final ThreadedDatabase result = task.doInBackground(name, configuration);
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute(result);
                        }
                    });
                } catch (final CouchbaseLiteException e) {
                    Log.e(TAG, "Failed to open database, CouchbaseLiteException: " + e.getMessage());
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute(e);
                        }
                    });
                }
            }
        });
    }

    static class OpenDatabaseTask {
        private Threaded.CompleteCallback callback;
        private Object context;

        public OpenDatabaseTask(Threaded.CompleteCallback callback, Object context) {
            this.callback = callback;
            this.context = context;
        }

        protected ThreadedDatabase doInBackground(String name, DatabaseConfiguration configuration) throws CouchbaseLiteException {
            return new ThreadedDatabase(name, configuration);
        }

        protected void onPostExecute(final ThreadedDatabase result) {
            if (result != null) {
                this.callback.onComplete(result, this.context);
            } else {
                this.callback.onError("OpenDatabaseTask returns no result.", this.context);
            }
        }

        protected void onPostExecute(final Exception e) {
            this.callback.onError("Failed to open database, CouchbaseLiteException: " + e.getMessage(), this.context);
        }
    }

    public void getDocument(final String documentId, final Threaded.CompleteCallback callback, final Object context) {
        final android.os.Handler mHandler = new android.os.Handler();
        final Database db = this.db;
        Threaded.threadPoolExecutor().execute(new Runnable() {
            @Override
            public void run() {
                final ThreadedDatabase.GetDocumentTask task = new ThreadedDatabase.GetDocumentTask(callback, context);
                final Document result = task.doInBackground(db, documentId);
                mHandler.post(new Runnable() {
                    @Override
                    public void run() {
                        task.onPostExecute(result);
                    }
                });
            }
        });
    }

    static class GetDocumentTask {
        private Threaded.CompleteCallback callback;
        private Object context;

        public GetDocumentTask(Threaded.CompleteCallback callback, Object context) {
            this.callback = callback;
            this.context = context;
        }

        protected Document doInBackground(Database db, String documentId) {
            return db.getDocument(documentId);
        }

        protected void onPostExecute(final Document result) {
            this.callback.onComplete(result, this.context);
        }
    }

    public void inBatch(final List<BatchAction> ActionList, final Threaded.CompleteCallback callback, final Object context) {
        final android.os.Handler mHandler = new android.os.Handler();
        final Database db = this.db;
        Threaded.threadPoolExecutor().execute(new Runnable() {
            @Override
            public void run() {
                final ThreadedDatabase.BatchTask task = new ThreadedDatabase.BatchTask(callback, context);
                try {
                    task.doInBackground(db, ActionList);
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute();
                        }
                    });
                } catch (final CouchbaseLiteException e) {
                    Log.e(TAG, "Failed to run batch, CouchbaseLiteException: " + e.getMessage());
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute(e);
                        }
                    });
                }
            }
        });
    }

    static class BatchTask {
        private Threaded.CompleteCallback callback;
        private Object context;

        public BatchTask(Threaded.CompleteCallback callback, Object context) {
            this.callback = callback;
            this.context = context;
        }

        protected void doInBackground(Database db, List<BatchAction> ActionList) throws CouchbaseLiteException {
            final Database localdb = db;
            final List<BatchAction> locallist = ActionList;
            db.inBatch(new Runnable() {
                @Override
                public void run() {
                    for (int i = 0; i < locallist.size(); i++) {
                        BatchAction action = locallist.get(i);
                        if (action.getType() == BatchAction.BatchActionType.CREATE || action.getType() == BatchAction.BatchActionType.UPDATE) {
                            try {
                                localdb.save(action.getDocument());
                            } catch (CouchbaseLiteException e) {
                                e.printStackTrace();
                            }
                        } else if (action.getType() == BatchAction.BatchActionType.DELETE) {
                            try {
                                localdb.delete(action.getDocument());
                            } catch (CouchbaseLiteException e) {
                                e.printStackTrace();
                            }
                        }
                    }
                }
            });
        }

        protected void onPostExecute() {
            this.callback.onComplete(null, this.context);
        }

        protected void onPostExecute(final Exception e) {
            this.callback.onError("Failed to save run batch, CouchbaseLiteException: " + e.getMessage(), this.context);
        }
    }

    public void save(final MutableDocument document, final Threaded.CompleteCallback callback, final Object context) {
        final android.os.Handler mHandler = new android.os.Handler();
        final Database db = this.db;
        Threaded.threadPoolExecutor().execute(new Runnable() {
            @Override
            public void run() {
                final ThreadedDatabase.SaveDocumentTask task = new ThreadedDatabase.SaveDocumentTask(callback, context);
                try {
                    task.doInBackground(db, document);
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute();
                        }
                    });
                } catch (final CouchbaseLiteException e) {
                    Log.e(TAG, "Failed to save document, CouchbaseLiteException: " + e.getMessage());
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute(e);
                        }
                    });
                }
            }
        });
    }

    static class SaveDocumentTask {
        private Threaded.CompleteCallback callback;
        private Object context;

        public SaveDocumentTask(Threaded.CompleteCallback callback, Object context) {
            this.callback = callback;
            this.context = context;
        }

        protected void doInBackground(Database db, MutableDocument document) throws CouchbaseLiteException {
            db.save(document);
        }

        protected void onPostExecute() {
            this.callback.onComplete(null, this.context);
        }

        protected void onPostExecute(final Exception e) {
            this.callback.onError("Failed to save document, CouchbaseLiteException: " + e.getMessage(), this.context);
        }
    }

    public void delete(final Document document, final Threaded.CompleteCallback callback, final Object context) {
        final android.os.Handler mHandler = new android.os.Handler();
        final Database db = this.db;
        Threaded.threadPoolExecutor().execute(new Runnable() {
            @Override
            public void run() {
                final ThreadedDatabase.DeleteDocumentTask task = new ThreadedDatabase.DeleteDocumentTask(callback, context);
                try {
                    task.doInBackground(db, document);
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute();
                        }
                    });
                } catch (final CouchbaseLiteException e) {
                    Log.e(TAG, "Failed to delete document, CouchbaseLiteException: " + e.getMessage());
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute(e);
                        }
                    });
                }
            }
        });
    }

    static class DeleteDocumentTask {
        private Threaded.CompleteCallback callback;
        private Object context;

        public DeleteDocumentTask(Threaded.CompleteCallback callback, Object context) {
            this.callback = callback;
            this.context = context;
        }

        protected void doInBackground(Database db, Document document) throws CouchbaseLiteException {
            db.delete(document);
        }

        protected void onPostExecute() {
            this.callback.onComplete(null, this.context);
        }

        protected void onPostExecute(final Exception e) {
            this.callback.onError("Failed to delete document, CouchbaseLiteException: " + e.getMessage(), this.context);
        }
    }

    public void delete(final Threaded.CompleteCallback callback, final Object context) {
        final android.os.Handler mHandler = new android.os.Handler();
        final Database db = this.db;
        Threaded.threadPoolExecutor().execute(new Runnable() {
            @Override
            public void run() {
                final ThreadedDatabase.DeleteTask task = new ThreadedDatabase.DeleteTask(callback, context);
                try {
                    task.doInBackground(db);
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute();
                        }
                    });
                } catch (final CouchbaseLiteException e) {
                    Log.e(TAG, "Failed to delete database, CouchbaseLiteException: " + e.getMessage());
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute(e);
                        }
                    });
                }
            }
        });
        this.db = null;
    }

    static class DeleteTask {
        private Threaded.CompleteCallback callback;
        private Object context;

        public DeleteTask(Threaded.CompleteCallback callback, Object context) {
            this.callback = callback;
            this.context = context;
        }

        protected void doInBackground(Database db) throws CouchbaseLiteException {
            db.delete();
        }

        protected void onPostExecute() {
            this.callback.onComplete(null, this.context);
        }

        protected void onPostExecute(final Exception e) {
            this.callback.onError("Failed to delete database, CouchbaseLiteException: " + e.getMessage(), this.context);
        }
    }

    public void executeQuery(final Query query, final Threaded.CompleteCallback callback, final Object context) {
        final android.os.Handler mHandler = new android.os.Handler();
        Threaded.threadPoolExecutor().execute(new Runnable() {
            @Override
            public void run() {
                final ThreadedDatabase.ExecuteQueryTask task = new ThreadedDatabase.ExecuteQueryTask(callback, context);
                try {
                    final List<Result> results = task.doInBackground(query);
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute(results);
                        }
                    });
                } catch (final CouchbaseLiteException e) {
                    Log.e(TAG, "Failed to execute query, CouchbaseLiteException: " + e.getMessage());
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute(e);
                        }
                    });
                }
            }
        });
    }

    static class ExecuteQueryTask {
        private Threaded.CompleteCallback callback;
        private Object context;

        public ExecuteQueryTask(Threaded.CompleteCallback callback, Object context) {
            this.callback = callback;
            this.context = context;
        }

        protected List<Result> doInBackground(Query query) throws CouchbaseLiteException {
            return query.execute().allResults();
        }

        protected void onPostExecute(List<Result> results) {
            this.callback.onComplete(results, this.context);
        }

        protected void onPostExecute(final Exception e) {
            this.callback.onError("Failed to execute query, CouchbaseLiteException: " + e.getMessage(), this.context);
        }
    }

    public void executeQuery(final Select query, final Threaded.CompleteCallback callback, final Object context) {
        final android.os.Handler mHandler = new android.os.Handler();
        Threaded.threadPoolExecutor().execute(new Runnable() {
            @Override
            public void run() {
                final ThreadedDatabase.ExecuteSelectQueryTask task = new ThreadedDatabase.ExecuteSelectQueryTask(callback, context);
                try {
                    final List<Result> results = task.doInBackground(query);
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute(results);
                        }
                    });
                } catch (final CouchbaseLiteException e) {
                    Log.e(TAG, "Failed to execute query, CouchbaseLiteException: " + e.getMessage());
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            task.onPostExecute(e);
                        }
                    });
                }
            }
        });
    }

    static class ExecuteSelectQueryTask {
        private Threaded.CompleteCallback callback;
        private Object context;

        public ExecuteSelectQueryTask(Threaded.CompleteCallback callback, Object context) {
            this.callback = callback;
            this.context = context;
        }

        protected List<Result> doInBackground(Select query) throws CouchbaseLiteException {
            return query.execute().allResults();
        }

        protected void onPostExecute(List<Result> results) {
            this.callback.onComplete(results, this.context);
        }

        protected void onPostExecute(final Exception e) {
            this.callback.onError("Failed to execute query, CouchbaseLiteException: " + e.getMessage(), this.context);
        }
    }

    public void addChangeListener(final DatabaseChangeListener listener, final Threaded.CompleteCallback callback, final Object context) {
        final android.os.Handler mHandler = new android.os.Handler();
        final Database db = this.db;
        Threaded.threadPoolExecutor().execute(new Runnable() {
            @Override
            public void run() {
                final ThreadedDatabase.AddChangeListenerTask task = new ThreadedDatabase.AddChangeListenerTask(callback, context);
                task.doInBackground(db, listener);
                mHandler.post(new Runnable() {
                    @Override
                    public void run() {
                        task.onPostExecute();
                    }
                });
            }
        });
    }

    static class AddChangeListenerTask {
        private Threaded.CompleteCallback callback;
        private Object context;

        public AddChangeListenerTask(Threaded.CompleteCallback callback, Object context) {
            this.callback = callback;
            this.context = context;
        }

        protected void doInBackground(Database db, DatabaseChangeListener listener) {
            db.addChangeListener(listener);
        }

        protected void onPostExecute() {
            this.callback.onComplete(null, this.context);
        }
    }
}
