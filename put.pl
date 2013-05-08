#!/usr/bin/perl

use LWP;
use HTTP::Request::Common;

my $ua = new LWP::UserAgent;
my $req = POST "http://localhost:2000/user/518a5e2ffdef83dd30000001/perm", [
  perm => "hello,again", 
];
$req->method("PUT");
print $req->as_string;
my $resp = $ua->request($req);
print $resp->as_string;


