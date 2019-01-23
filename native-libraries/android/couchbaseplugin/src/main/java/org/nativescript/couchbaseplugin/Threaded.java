package org.nativescript.couchbaseplugin;

import com.couchbase.lite.Database;
import com.couchbase.lite.DatabaseConfiguration;

import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

public class Threaded {
    static final String TAG = "Threaded";
    static ThreadPoolExecutor executor = null;

    static ThreadPoolExecutor threadPoolExecutor() {
        if (executor == null) {
            int NUMBER_OF_CORES = Runtime.getRuntime().availableProcessors();
            ThreadFactory backgroundPriorityThreadFactory = new PriorityThreadFactory(android.os.Process.THREAD_PRIORITY_BACKGROUND);

            executor = new ThreadPoolExecutor(
                    NUMBER_OF_CORES * 2,
                    NUMBER_OF_CORES * 2,
                    60L,
                    TimeUnit.SECONDS,
                    new LinkedBlockingQueue<Runnable>(),
                    backgroundPriorityThreadFactory
            );
        }

        return executor;
    }

    public interface CompleteCallback {
        void onComplete(Object result, Object tag);

        void onError(String error, Object tag);
    }

    static class PriorityThreadFactory implements ThreadFactory {
        private final int mThreadPriority;

        public PriorityThreadFactory(int threadPriority) {
            mThreadPriority = threadPriority;
        }

        @Override
        public Thread newThread(final Runnable runnable) {
            Runnable wrapperRunnable = new Runnable() {
                @Override
                public void run() {
                    try {
                        android.os.Process.setThreadPriority(mThreadPriority);
                    } catch (Throwable t) {

                    }
                    runnable.run();
                }
            };
            return new Thread(wrapperRunnable);
        }
    }
}
