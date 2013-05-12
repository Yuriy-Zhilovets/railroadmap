#!/usr/bin/perl

use LWP;
use HTTP::Request::Common;

my $ua = new LWP::UserAgent;
my $req = POST "http://localhost:2000/user/xxx/perm", [
  login => "yz",
  passhash => "12345676",
];
print $req->as_string;
my $resp = $ua->request($req);
print $resp->as_string;


