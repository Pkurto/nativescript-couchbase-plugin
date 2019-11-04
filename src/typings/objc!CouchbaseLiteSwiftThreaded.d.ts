
declare var CouchbaseLiteSwiftThreadedVersionNumber: number;

declare var CouchbaseLiteSwiftThreadedVersionString: interop.Reference<number>;

declare class ThreadedDatabase extends NSObject {

	static OpenWithNameCompleteHandler(name: string, completeHandler: (p1: ThreadedDatabase) => void): void;

	static alloc(): ThreadedDatabase; // inherited from NSObject

	static new(): ThreadedDatabase; // inherited from NSObject

	database: CBLDatabase;

	dbQueue: NSObject;

	listeners: NSArray<CBLListenerToken>;

	constructor(o: { name: string; dispatch: NSObject; });

	addChangeListenerWithListenerCompleteHandler(listener: (p1: CBLDatabaseChange) => void, completeHandler: (p1: CBLListenerToken) => void): void;

	deleteWithCompleteHandler(completeHandler: (p1: NSError) => void): void;

	deleteWithDocumentCompleteHandler(document: CBLDocument, completeHandler: (p1: NSError) => void): void;

	executeQueryWithQueryCompleteHandler(query: CBLQuery, completeHandler: (p1: CBLQueryResultSet, p2: NSError) => void): void;

	getDocumentWithDocIdCompleteHandler(docId: string, completeHandler: (p1: CBLDocument) => void): void;

	inBatchWithActionListCompleteHandler(actionList: NSArray<ThreadedDatabaseBatchAction> | ThreadedDatabaseBatchAction[], completeHandler: (p1: NSError) => void): void;

	initWithNameDispatch(name: string, dispatch: NSObject): this;

	saveWithMutableDocCompleteHandler(mutableDoc: CBLMutableDocument, completeHandler: (p1: NSError) => void): void;
}

declare class ThreadedDatabaseBatchAction extends NSObject {

	static alloc(): ThreadedDatabaseBatchAction; // inherited from NSObject

	static new(): ThreadedDatabaseBatchAction; // inherited from NSObject

	static setCreateType(value: string): void;

	static setDeleteType(value: string): void;

	static setUpdateType(value: string): void;

	mutableDoc: CBLMutableDocument;

	type: string;

	static CreateType: string;

	static DeleteType: string;

	static UpdateType: string;

	getMutableDocument(): CBLMutableDocument;

	getType(): string;

	setMutableDocumentWithMutableDoc(mutableDoc: CBLMutableDocument): void;

	setTypeWithType(type: string): void;
}
