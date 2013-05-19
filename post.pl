#!/usr/bin/perl

use LWP;
use HTTP::Request::Common;

my $ua = new LWP::UserAgent;
my $req = POST "http://localhost:2000/owner", [
  name=>"root3",
  parent=>"5197f4f9aae8c7073e000009",
];
print $req->as_string;
my $resp = $ua->request($req);
print $resp->as_string;


