#!/usr/bin/perl

use LWP;
use HTTP::Request::Common;

my $ua = new LWP::UserAgent;
my $req = PUT "http://localhost:2000/point/5184eb45edee24860d000001";
$req->method("DELETE");
print $req->as_string;
my $resp = $ua->request($req);
print $resp->as_string;


