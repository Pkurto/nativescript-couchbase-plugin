package org.nativescript.couchbaseplugin;

import com.couchbase.lite.MutableDocument;

public class BatchAction {
    private MutableDocument document;
    private BatchActionType type;
    public BatchAction() {}

    public MutableDocument getDocument() {
        return document;
    }

    public void setDocument(MutableDocument document) {
        this.document = document;
    }

    public BatchActionType getType() {
        return type;
    }

    public void setType(BatchActionType type) {
        this.type = type;
    }

    public enum BatchActionType {
        CREATE, UPDATE, DELETE
    }
}
