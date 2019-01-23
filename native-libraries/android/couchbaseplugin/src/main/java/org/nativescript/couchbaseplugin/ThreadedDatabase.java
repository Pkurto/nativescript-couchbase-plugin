package org.nativescript.couchbaseplugin;

import android.util.Log;

import com.couchbase.lite.CouchbaseLiteException;
import com.couchbase.lite.Database;
import com.couchbase.lite.DatabaseConfiguration;

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
}
