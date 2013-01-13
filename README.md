# CAF (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app.

See http://www.cafjs.com 

## CAF Extra Deploy

This repository contains a CAF extra lib to deploy applications in Cloud Foundry.


## API

    lib/proxy_deploy.js

See the Turtles example application.
 
## Configuration Example

### framework.json

       "plugs": [
           {
            "module": "caf_deploy/plug",
            "name": "deploy_mux",
            "description": "Shared connection to a service that deploys apps in CF\n Properties: \n",
            "env": {
                "target" : "http://api.cafjs.com",
                "user" : "bad@bar.com",
                "password" : "supersecret",
                "memory" : 64,
                "instances": 1,
                "services" :["redis"]
            }
          }
        
        
The properties define the vcap target, username, and password. They also specify how many instances should host you application, the maximum memory the can use, and the extra services that your application needs.
        

### ca.json

    "internal" : [
        {
            "module": "caf_deploy/plug_ca",
            "name": "deploy_ca",
            "description": "Provides a  service  to deploy apps for this CA",
            "env" : {

            }
        }
        ...
     ]
     "proxies" : [
       {
            "module": "caf_deploy/proxy",
            "name": "deploy",
            "description": "Access to a service to deploy CF apps",
            "env" : {

            }
        },
        ...
      ]
  
  
    
        
            
 
