//
//  ThreadedDatabase.swift
//  Testie
//
//  Created by Lennart on 06/03/2019.
//  Copyright © 2019 Lennart. All rights reserved.
//

import Foundation

@objcMembers
public class ThreadedDatabase: NSObject {
    public var database: CBLDatabase
    static var queue = DispatchQueue(label: "com.klippa.nativescript.couchbaselite.queue", qos:.userInitiated)
    public var dbQueue: DispatchQueue
    public var listeners = [CBLListenerToken]()
    public init(name: String, dispatch: DispatchQueue) throws {
        // throw databaseError.initFailed
        do {
            self.database = try CBLDatabase.init(name: name)
            self.dbQueue = dispatch
        } catch {
            throw databaseError.initFailed
        }
        print("Current thread in \(#function) is \(Thread.current)")
    }
    
    public static func Open(name: String, completeHandler: @escaping (ThreadedDatabase?) -> ()) {
        self.queue.async {
            do {
                let db = try ThreadedDatabase(name: name, dispatch:self.queue)
                DispatchQueue.main.async {
                    completeHandler(db)
                }
                } catch {
                    completeHandler(nil)
                }
            
            }
    }
    
    
    public func save(mutableDoc: CBLMutableDocument, completeHandler: @escaping (Error?) -> ()){
        self.dbQueue.async {
            do {
                // throw databaseError.saveFailed
                try self.database.save(mutableDoc)
                DispatchQueue.main.async {
                    completeHandler(nil)
                }
            } catch let error {
                DispatchQueue.main.async {
                    completeHandler(error)
                }
            }
        }
    }
    
    public func executeQuery(query: CBLQuery, completeHandler: @escaping (CBLQueryResultSet?, Error?) -> ()) {
        self.dbQueue.async {
            do {
                let result = try query.execute()
                DispatchQueue.main.async {
                    completeHandler(result, nil)
                }
            } catch let error {
                DispatchQueue.main.async {
                    completeHandler(nil, error)
                }
            }
        }
    }
    
    public func delete(document: CBLDocument, completeHandler: @escaping (Error?) -> ()){
        self.dbQueue.async {
            do {
                try self.database.delete(document)
                DispatchQueue.main.async {
                    completeHandler(nil)
                }
            } catch let error {
                DispatchQueue.main.async {
                    completeHandler(error)
                }
            }
        }
    }
    
    public func inBatch(actionList: [ThreadedDatabaseBatchAction], completeHandler: @escaping (Error?) -> ()) {
        self.dbQueue.async {
            do {
                try self.database.inBatch {
                    for action in actionList {
                        if (action.getType() == ThreadedDatabaseBatchAction.CreateType || action.getType() == ThreadedDatabaseBatchAction.UpdateType) {
                            do {
                                try self.database.save(action.getMutableDocument()!)
                            } catch {
                                DispatchQueue.main.async {
                                    completeHandler(error)
                                }
                            }
                        } else if (action.getType() == ThreadedDatabaseBatchAction.DeleteType){
                            do {
                                try self.database.delete(action.getMutableDocument()!)
                            } catch let error {
                                DispatchQueue.main.async {
                                    completeHandler(error)
                                }
                            }
                        }
                    }
                }
                
                DispatchQueue.main.async {
                    completeHandler(nil)
                }
            } catch let error {
                DispatchQueue.main.async {
                    completeHandler(error)
                }
            }
        }
    }
    
    
    public func addChangeListener(listener: @escaping (CBLDatabaseChange) -> Void, completeHandler: @escaping (CBLListenerToken) -> ()) {
        self.dbQueue.async {
            let token = self.database.addChangeListener(with: self.dbQueue, listener: listener)
            self.listeners.append(token)
            DispatchQueue.main.async {
                completeHandler(token)
            }
//            do {
//                let token = try self.database.addChangeListener(with: self.dbQueue, listener: listener)
//                self.listeners.append(token)
//                DispatchQueue.main.async {
//                    completeHandler(token, nil)
//                }
//            } catch let error {
//                completeHandler(nil, error)
//            }
        }
    }
    
    public func delete(completeHandler: @escaping (Error?) -> ()) {
        self.dbQueue.async {
            for listener in self.listeners {
                self.database.removeChangeListener(with: listener)
            }
            do {
                try self.database.delete()
            } catch let error {
                DispatchQueue.main.async {
                    completeHandler(error)
                }
            }
            DispatchQueue.main.async {
                completeHandler(nil)
            }
        }
    }
    
    public func getDocument(docId:String, completeHandler: @escaping (CBLDocument?) -> ()){
        self.dbQueue.async {
            let doc = self.database.document(withID: docId)
            DispatchQueue.main.async {
                completeHandler(doc)
            }
        }
    }
    
    enum databaseError: Error{
        case initFailed
        case saveFailed
    }
    
}
