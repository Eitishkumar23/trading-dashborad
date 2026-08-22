#!/bin/bash

MODE=$1

#Checking whether argument is provide or not
if [[ -z "$MODE" ]]
then 
    echo "No argument passed"
    exit 1
fi

#Redis connectivity checking..
redis_health(){

#checking whether redis-cli works or not
if !command -v redis-cli &>/dev/null 
then 
    echo "Redis-cli not found"
    return 1
fi

HEALTH=$(redis-cli ping 2>/dev/null)


if [[ $HEALTH == "PONG" ]]
then
    echo "redis is working"
    return 0
else 
    echo "redis not working"
    return 1
fi

}

#Disk usgae checking...
disk_usage(){
DISK_USAGE=$( df -H | grep "overlay" | head -1 | awk '{print $5}' | tr -d '%' )

if [[ -z "$DISK_USAGE" ]]
then 
    echo "cant determine disk usage"
    return 1
fi

if [[ $DISK_USAGE -le 80 ]]
then
    echo "disk-usage is normal - $DISK_USAGE%"
    return 0
else
    echo "disk-usage is critical or low - $DISK_USAGE%"
    return 1
fi

}

#using case staement to decide which service to check
case "$MODE" in 
     redis)
          redis_health
          exit $?
          ;;
     disk)
          disk_usage
          exit $?
          ;;
     all)
          redis_health
          REDIS_STATUS=$?

          disk_usage
          DISK_STATUS=$?
        
        if [[ $REDIS_STATUS == 0 && $DISK_STATUS == 0 ]]
        then  
             echo "Overall system is healthy"
             exit 0
        else 
             echo "Overall system is not healthy"
             exit 1
        fi
        ;;
     *)
      echo "Your entered argument is not valid : $MODE"
      exit 1
      ;;
esac



             





