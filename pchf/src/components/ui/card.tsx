import * as React from "react";

function Card({ className="", ...props }: React.ComponentProps<"div">){
  return(
    <div className={`card ${className}`} {...props}/>
  );
}
function CardHeader({className="", ...props }: React.ComponentProps<"div">){
  return(
    <div className={`card-header ${className}`}{...props}/>
  );
}
function CardTitle ({className = "", ...props }: React.ComponentProps<"div">){
  return(
    <div className={`card-title ${className}`} {...props}/>
  );
}
function CardDescription({className="", ...props }: React.ComponentProps<"div">){
  return(
    <div className={`d-flex justify-content-end ${className}`} {...props}/>
  );
}
function CardAction({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div className={`d-flex justify-content-end ${className}`} {...props} />
  );
}
function CardContent({ className = "", ...props }: React.ComponentProps<"div">) {
  return (
    <div className={`card-body ${className}`} {...props} />
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