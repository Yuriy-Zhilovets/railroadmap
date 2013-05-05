#!/usr/bin/perl

use LWP;
use HTTP::Request::Common;

my $ua = new LWP::UserAgent;
my $req = POST "http://localhost:2000/station", [
  coord=>"37.85,48.00,37.83,48.002,37.78,47.99",
  name=>"Railway!"
];
print $req->as_string;
my $resp = $ua->request($req);
print $resp->as_string;


