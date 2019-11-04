//
//  BatchAction.swift
//  Testie
//
//  Created by Lennart on 06/03/2019.
//  Copyright © 2019 Lennart. All rights reserved.
//

import Foundation

@objcMembers
public class ThreadedDatabaseBatchAction: NSObject {
    public var mutableDoc: CBLMutableDocument?
    public var type: String?
        
    public func getMutableDocument() -> CBLMutableDocument? {
        return self.mutableDoc
    }
    
    public func setMutableDocument(mutableDoc: CBLMutableDocument) {
        self.mutableDoc = mutableDoc
    }
    
    @objc
    public func getType() -> String? {
        return self.type
    }
    
    public func setType(type: String) {
        self.type = type
    }
    
    public static var UpdateType: String = "UPDATE";
    public static var DeleteType: String = "DELETE";
    public static var CreateType: String = "CREATE";
}
