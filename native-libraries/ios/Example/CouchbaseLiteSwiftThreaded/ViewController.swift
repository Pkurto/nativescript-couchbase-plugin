//
//  ViewController.swift
//  CouchbaseLiteSwiftThreaded
//
//  Created by lennart@klippa.com on 03/08/2019.
//  Copyright (c) 2019 lennart@klippa.com. All rights reserved.
//

import UIKit
import CouchbaseLiteSwiftThreaded

class ViewController: UIViewController {
    var db: ThreadedDatabase?;
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        ThreadedDatabase.Open(name: "example") { (db) in
            if (db != nil) {
                self.db = db
                self.afterDBInit()
            } else {
                print("helemaal mis dit")
            }
        }
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    func afterDBInit() {
        self.db?.addChangeListener(listener: { (change) in
            print(change.documentIDs!)
        }, completeHandler: { (token) in
            print(token)
        })
        
        // Create new document
        let mutableDoc = CBLMutableDocument.init();
        mutableDoc.setFloat(2.0, forKey: "version");
        mutableDoc.setString("SDK", forKey: "type");
        mutableDoc.setString("WoopwWOOOP", forKey: "language");
        
        // Save document to database
        self.db?.save(mutableDoc: mutableDoc) { (error) in
            if(error != nil){
                print(error.debugDescription)
                return
            }
            print("Document ID :: \(mutableDoc.id)")
            print("Learning \(mutableDoc.string(forKey: "language")!)")
            self.db?.delete(document:mutableDoc){(error) in
                if(error != nil){
                    print("doc deletion went wrong")
                } else {
                    print("doc deleted")
                }
            }
        }
    }
}

