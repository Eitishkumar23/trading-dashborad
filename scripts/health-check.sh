#!/bin/bash

echo " Checking Health..... "

#Checking whether command exits or not and handling is done
if ! command -v redis-cli &> /dev/null
then 
     echo "Error : redis-cli not found"
     exit 1
fi
     

#Health Checking for redis
HEALTHCHECK=$(redis-cli ping 2>/dev/null)

if [[ "$HEALTHCHECK" == "PONG" ]]
then 
      echo " Container redis is healthy"
      Redis_health=0
else 
      echo " Container is down"
      Redis_health=1
fi

#Disk Usage Checking
DISK_USAGE=$( df -H | grep "overlay" | head -1 | awk '{print $5}' | tr -d '%' )


if [ -z "$DISK_USAGE" ]
then 
     echo "Disk usage cant be determine"
elif [[ $DISK_USAGE -lt 20 ]]
then  
     echo "Disk Usage is normal - $DISK_USAGE% used"
     Disk=0
else 
     echo "Disk Usage is high - $DISK_USAGE% used"
     Disk=1
fi

#Conclusion of Both
if [[ $Redis_health -eq 0 && $Disk -eq 0 ]]
then 
    echo "Overall System is Healthy"
    exit 0
else 
    echo "Overall Unhealthy"
    exit 1
fi

