#!/usr/bin/perl

use LWP;
use HTTP::Request::Common;

my $ua = new LWP::UserAgent;
my $req = PUT "http://localhost:2000/user/518a0ded126b654114000001";
$req->method("DELETE");
print $req->as_string;
my $resp = $ua->request($req);
print $resp->as_string;


