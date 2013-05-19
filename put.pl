#!/usr/bin/perl

use LWP;
use HTTP::Request::Common;

my $ua = new LWP::UserAgent;
my $req = POST "http://localhost:2000/owner/5197f512aae8c7073e000003", [
  name=>"hello",
];
$req->method("PUT");
print $req->as_string;
my $resp = $ua->request($req);
print $resp->as_string;


