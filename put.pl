#!/usr/bin/perl

use LWP;
use HTTP::Request::Common;

my $ua = new LWP::UserAgent;
my $req = POST "http://localhost:2000/rail/518516164a03929516000001", [
  coord=>"40.3333,55.35644,67.98,45.004,12,23,34,56",name=>"Nice rail?"
];
$req->method("PUT");
print $req->as_string;
my $resp = $ua->request($req);
print $resp->as_string;


