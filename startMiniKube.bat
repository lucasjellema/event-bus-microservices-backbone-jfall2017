set MINIKUBE_HOME=C:\Users\lucas_j\.minikube

    minikube start

minikube ip

kubectl run redis-cache --image=redis --port=6379

kubectl expose deployment redis-cache --type=ClusterIP

cd CacheInspector
REM the deployment.yaml defines a services and a three replica deployment
kubectl apply -f CacheInspectorDeployment.yaml

REM replaced with deployment kubectl create -f CacheInspectorPod.yaml  -f CacheInspectorService.yaml

cd ..
cd LogMonitor
kubectl create -f LogMonitorPod.yaml  -f LogMonitorService.yaml


cd ..
cd TweetReceiver
kubectl create -f TweetReceiverPod.yaml  -f TweetReceiverService.yaml

cd ..
cd TweetEnricher
kubectl create -f TweetEnricherPod.yaml  -f TweetEnricherService.yaml

cd ..
cd ValidateTweet
kubectl create -f ValidateTweetPod.yaml  -f ValidateTweetService.yaml

cd ..
cd WorkflowLauncher
REM run workflow launcher locally instead of inside Kubernetes (primarily because of instability)
REM kubectl create -f WorkflowLauncherPod.yaml  

cd ..
cd TweetBoard
kubectl create -f TweetBoardPod.yaml  -f TweetBoardService.yaml


cd ..

minikube ip
kubectl get pods
kubectl get services

REM now update postman - set correct minikube IP and service ports
REM through postman, set workflow template in cache
