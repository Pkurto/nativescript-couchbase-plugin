#
# Be sure to run `pod lib lint CouchbaseLiteSwiftThreaded.podspec' to ensure this is a
# valid spec before submitting.
#
# Any lines starting with a # are optional, but their use is encouraged
# To learn more about a Podspec see https://guides.cocoapods.org/syntax/podspec.html
#

Pod::Spec.new do |s|
  s.name             = 'CouchbaseLiteSwiftThreaded'
  s.version          = '1.0.10'
  s.summary          = 'A short meaningful description of CouchbaseLiteSwiftThreaded.'
  s.swift_version = '3.2'
# This description is used to generate tags and improve search results.
#   * Think: What does it do? Why did you write it? What is the focus?
#   * Try to keep it short, snappy and to the point.
#   * Write the description between the DESC delimiters below.
#   * Finally, don't worry about the indent, CocoaPods strips it!

  s.description      = <<-DESC
This pod can be used as a threaded implementation of CouchbaseDB. This description has to be longer than the summary to prevent warnings, so I made this sentence quite long.
                       DESC

  s.homepage         = 'https://git.devpros.nl/klippa/couchbaseliteswiftthreaded'
  # s.screenshots     = 'www.example.com/screenshots_1', 'www.example.com/screenshots_2'
  s.license          = { :type => 'MIT', :file => 'LICENSE' }
  s.author           = { 'Lennart Faber' => 'lennart@klippa.com' }
  s.source           = { :git => 'https://git.devpros.nl/klippa/couchbaseliteswiftthreaded.git', :tag => s.version.to_s }
  # s.social_media_url = 'https://twitter.com/<TWITTER_USERNAME>'

  s.ios.deployment_target = '9.0'

  s.source_files = 'CouchbaseLiteSwiftThreaded/Classes/**/*'
  
  # s.resource_bundles = {
  #   'CouchbaseLiteSwiftThreaded' => ['CouchbaseLiteSwiftThreaded/Assets/*.png']
  # }

  #s.public_header_files = 'CouchbaseLiteSwiftThreaded/Classes/**/*.h'
  s.xcconfig = {
    'HEADER_SEARCH_PATHS' => "\"${PODS_TARGET_SRCROOT}/CouchbaseLiteSwiftThreaded/Classes\""
  }
  # s.frameworks = 'UIKit', 'MapKit'
  s.dependency 'CouchbaseLite', '~> 2.1.3'
end
