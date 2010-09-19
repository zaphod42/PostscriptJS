#!/usr/bin/perl

use Mojolicious::Lite;
use File::Basename;

get '/postscripts' => sub {
    shift->render_json([ map { s/^public\///; $_ } <public/postscripts/*.ps> ]);
};

app->start("daemon");
