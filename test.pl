#!/usr/bin/perl

package Util;

use strict;
use warnings;
use File::Find qw();
use feature ':5.10';

sub async(&) {
    my $block = shift;
    if (my $child = fork()) {
        return $child;
    } else {
        $block->();
        exit(0);
    }
}

sub js_files_in {
    my %args = @_;
    my $exclusion = $args{exclude} // '^NO EXCLUSIONS$';
    my @files;

    File::Find::find(sub { 
        if (/\.js$/ && $File::Find::name !~ /$exclusion/) {
            push @files, $File::Find::name;
        }
    }, $args{include});

    return \@files;
}

sub diag {
    say("#" . guard(shift));
}

sub guard {
    my $msg = shift;
    $msg =~ s/\n/\n#/g;
    return $msg;
}

package TAP;

use strict;
use warnings;
use feature ':5.10';
use Data::Dumper;

my $test_number = 1;
my $failed = 0;

sub output {
    my $message = shift;
    given($message) {
        when(qr/plan/) {
            say("1..$_->{plan}");
        }
        when(qr/finished/) {
            exit($failed);
        }
        when(qr/failedCount/) {
            print "not " if ($_->{failedCount});
            say("ok $test_number - " . Util::guard("$_->{suite} - $_->{spec}"));

            if ($_->{failedCount}) {
                Util::diag(join q(, ), @{ $_->{description} });
                $failed += 1;
            }

            $test_number += 1;
        }
        when(qr/text/) {
            Util::diag($_->{text});
        }
        default {
            say("Bail out! Unknown command: " . Dumper($message));
        }
    }
}

package Web;

use Mojolicious::Lite;
use feature ':5.10';

websocket '/results' => sub {
    my $self = shift;

    my $parser = Mojo::JSON->new();
    $self->on_message(sub {
        my ($self, $json) = @_;
        TAP::output($parser->decode($json));
    });
};

get '/' => sub {
    my $self = shift;
    $self->render('test', files => { jasmine => Util::js_files_in(include => 'spec/javascripts/support'), 
                                     public => Util::js_files_in(include => 'public/javascripts'), 
                                     test => $self->stash('tests') });
};

get '/(*path)' => sub {
    my $self = shift;
    my $path = $self->stash('path');
    $self->render(text => Mojo::Asset::File->new(path => $path)->slurp, format => 'text/javascript');
};

sub startup {
    my $spec_scripts = shift // Util::js_files_in(include => 'spec/javascripts', exclude => 'spec/javascripts/support');
    app->defaults({ tests => $spec_scripts });
    app->start('daemon');
}

package Browser;

use strict;
use warnings;
use File::Temp;

sub open {
    my $url = shift;

    my $temp = File::Temp->new(TEMPLATE => "$0.XXXXXXX", SUFFIX => ".html");
    print $temp "<html><head><meta http-equiv='refresh' content='0;url=$url'></head></html>";

    my $safari = Util::async { exec("/Applications/Safari.app/Contents/MacOS/Safari $temp") };
    $SIG{INT} = $SIG{HUP} = $SIG{PIPE} = $SIG{TERM} = sub { kill('INT', $safari) and unlink($temp) and exit };
    waitpid($safari, 0);
}

package main;

my $spec_scripts = $ARGV[0] ? [$ARGV[0]] : undef;
my $web = Util::async { Web::startup($spec_scripts) };
my $browser = Util::async { Browser::open('http://localhost:3000') };

waitpid($web, 0);
my $exit_status = $? >> 8;
kill('INT', $browser);
wait();

exit($exit_status);

package Web;

__DATA__

@@ test.html.ep
<html>
    <head>
        <% my $script = begin %>
            <% for (@{ $_[0] }) { %> 
                <script src="<%= $_ %>"></script>
            <% } %>
        <% end %>

        <%== $script->($files->{jasmine}) %>
        <%== $script->($files->{public}) %>
        <%== $script->($files->{test}) %>
    </head>
    <body>
        <div id="reporting"></div>
    </body>
</html>

@@ favicon.ico (base64)
AAABAAEAEBAAAAAAAABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAAAAA
AAAAAAAAAAEAAAAAAAAAAAAA/4QAAP/IjAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAIBAQIAAAAAAAAAAAAAAAIBAgIBAgAAAAAAAAAA
AAIBAgAAAgEAAAAAAAAAAAABAQEAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAA
AAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAA
AAAAAQIAAAEAAAIBAAAAAAAAAAEBAQEBAQEBAQAAAAAAAAABAgAAAAAAAgEAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//
AAD//wAA+H8AAPA/AADjPwAA478AAP+/AAD/vwAA/78AAP+/AAD5swAA+AMAAPnz
AAD//wAA//8AAP//AAA=
