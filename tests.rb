require 'mozrepl_client'
require 'net/telnet'

class Net::Telnet;
  RE = /repl\d*>/
  def mozcmd(s)
    s = self.cmd('String' => s, 'Match' => RE)
    s.gsub(RE, '').strip
  end
end

files = Dir['content/*.js'] + Dir['tests/init.js'] + Dir['tests/*_test.js']

telnet = Net::Telnet::new('Host' => 'localhost', 'Port' => 4242) # MozRepl

files.map(&File.method(:new)).each do |file|
  #puts "Sending #{file.path}"
  s = telnet.mozcmd file.read
  #puts s
end

puts "Launching tests"
puts telnet.mozcmd('runTests();')
