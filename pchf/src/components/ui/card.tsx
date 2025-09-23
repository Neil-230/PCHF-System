import * as React from "react";

function Card({ className="", ...props }: React.ComponentProps<"div">){
  return(
    <div className={`card p-3 rounded-3 border-0 ${className}`} {...props} style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}/>
  );
}
function CardHeader({className="", ...props }: React.ComponentProps<"div">){
  return(
    <div className={`card-header bg-transparent border-bottom-0 ${className}`}{...props}/>
  );
}
function CardTitle ({className = "", ...props }: React.ComponentProps<"div">){
  return(
    <div className={`card-title ${className}`} {...props}/>
  );
}
function CardDescription({className="", ...props }: React.ComponentProps<"div">){
  return(
    <div className={`d-flex ${className}`} {...props}/>
  );
}
function CardAction({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div className={`d-flex justify-content-end ${className}`} {...props} />
  );
}
function CardContent({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div className={`card-body pb-0 pt-0 ${className}`} {...props} />
  );
}
function CardFooter({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div className={`card-footer d-flex align-items-center ${className}`} {...props} />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};