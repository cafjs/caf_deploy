Internal notes to deploy  on K8s (not generally applicable...)
--------------------------------------------------------------

- Set cluster sufix

        export APP_SUFFIX=cafjs.com

- Create secrets with ssl keys for nginx:

        kubectl create secret generic ssl-keys-cafjs --from-file=./fullchain1.pem --from-file=./privkey1.pem

- Ditto for priv/pub keys for token signing.

- Ditto for priv/pub keys for reCaptcha.

- Deploy nginx:

        kubectl apply -f nginx.conf.yaml
        kubectl apply -f nginx-deploy.yaml

- If missing, ditto for service-account.yaml, Roles.yaml, namespaces.yaml, and nfs storage (changes based on local set up...)

- Deploy turtles:

        export APP_IS_DEPLOYER=true;./k8s_deploy.js create root-turtles gcr.io/cafjs-k8/root-turtles; unset APP_IS_DEPLOYER

-Deploy accounts:

    export APP_IS_ACCOUNTS=true;./k8s_deploy.js create root-accounts gcr.io/cafjs-k8/root-accounts; unset APP_IS_ACCOUNTS

-Deploy launcher:

    ./k8s_deploy.js create root-launcher gcr.io/cafjs-k8/root-launcher

-Login as root (create account if needed), create an instance of turtles, then deploy all the other apps with it.
