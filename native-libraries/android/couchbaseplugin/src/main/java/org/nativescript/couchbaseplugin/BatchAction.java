package org.nativescript.couchbaseplugin;

import com.couchbase.lite.Document;
import com.couchbase.lite.MutableDocument;

public class BatchAction {
    private Document document;
    private MutableDocument mutableDocument;
    private BatchActionType type;
    public BatchAction() {}

    public Document getDocument() {
        return document;
    }

    public void setDocument(Document document) {
        this.document = document;
    }

    public MutableDocument getMutableDocument() {
        return mutableDocument;
    }

    public void setMutableDocument(MutableDocument mutableDocument) {
        this.mutableDocument = mutableDocument;
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
